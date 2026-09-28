# Dispatchly

A from-scratch rebuild of the uploaded "Email Job Scheduler" project: same
core capability (schedule single or CSV/bulk emails, delivered on time
through Ethereal test inboxes, rate-limited per account, durable across
restarts, real Google sign-in), rebuilt with a different data model, a
different backend module layout, a different rate-limiting/idempotency
implementation, and a completely different UI.

---

## 1. What changed, and why

| Area | Original | Dispatchly | Why |
|---|---|---|---|
| Data model naming | `User` / `Sender` / `Batch` / `Email` | `User` / `MailAccount` / `Campaign` / `Message` | Clearer domain language; a "campaign" is the unit the user launches, a "message" is one delivery |
| Status enum | lowercase (`scheduled`, `processing`, ...) | uppercase `MessageStatus` (`QUEUED`, `CLAIMED`, `DELIVERED`, `FAILED`) | Simpler 4-state lifecycle, explicit Prisma enum instead of string literals |
| Backend framework choices | Passport-free Google OAuth, raw SQL claim | kept both ideas but re-implemented independently | These were good decisions worth keeping — re-derived, not copied |
| Rate limiting | one Lua script (spacing + hourly) | own Lua script (`DeliveryThrottle`), different key layout, decrement-based release | Same two guarantees, independent implementation |
| Recovery on restart | reconcile "processing" + orphaned "scheduled" rows | `recoveryService.ts`: `reconcileStaleClaims` + `requeueOrphans`, with a fix so a reclaimed stale row gets a fresh job immediately instead of silently stalling | Functionally equivalent, closes a gap found while re-deriving it |
| Search | client-side filter only | real backend search (`?q=`) across recipient/subject/body, still paired with client-side polling | Matches the spirit of "add search" without pretending the UI does something the API doesn't |
| Frontend framework | inbox-style single view, Gmail palette (`#00a843`), sidebar nav, `contentEditable` compose, full-page navigation | top navbar + tab pills, indigo/slate ("ink") palette, `Sora`/`Inter` type pairing, stat cards, right-side slide-over drawers for compose and detail, floating action button | Substantially different layout, navigation pattern, and visual language while keeping the same user flows |
| Auth transport | JWT cookie + `?token=` redirect + localStorage bearer | same dual-transport idea (works across different frontend/backend origins), re-implemented with `google-auth-library` directly and a signed-state CSRF check | Kept the practical cross-origin-friendly design, rewritten end to end |
| Attachments / rich text | `contentEditable` editor with base64-embedded images | plain textarea, CSV/TXT upload for recipients only | Simplified deliberately — rich HTML-in-body editing added risk and complexity out of proportion to the assignment's core ask; documented here rather than silently dropped |

Nothing from the original's source was copied verbatim — every file here
was written fresh, informed by understanding what the original did and why.

---

## 2. Project layout

```
dispatchly/
├── docker-compose.yml          # Postgres + Redis
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # User, MailAccount, Campaign, Message
│   │   ├── migrations/000_init/migration.sql
│   │   └── seed.ts               # provisions an Ethereal mail-account pool
│   ├── src/
│   │   ├── config/env.ts         # zod-validated environment config
│   │   ├── lib/                  # prisma.ts, redis.ts, logger.ts
│   │   ├── repositories/         # mailAccountRepository, messageRepository
│   │   ├── services/             # campaignService, deliveryThrottle, mailer,
│   │   │                        # googleAuthService, recoveryService
│   │   ├── queue/                # deliveryQueue, deliveryProcessor, workerFactory
│   │   ├── controllers/, routes/, middleware/, validators/, types/
│   │   ├── app.ts                 # Express app assembly
│   │   ├── server.ts              # API + inline worker (single-service deploy)
│   │   └── worker.ts              # standalone worker process
│   └── tests/                     # throttle, scheduling, validators, recovery, launch
└── frontend/
    └── src/
        ├── lib/ (api.ts, csv.ts, dates.ts), hooks/ (useAuth, useMessageFeed)
        ├── components/ (TopNav, MessageList, StatCard, StatusPill, drawers, compose/*)
        └── pages/ (LoginPage, DashboardPage)
```

---

## 3. Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A Google Cloud OAuth 2.0 Client ID

---

## 4. Setup & running

### 4.1 Infrastructure

```bash
docker compose up -d
```

### 4.2 Backend

```bash
cd backend
cp .env.example .env         # fill in GOOGLE_CLIENT_ID/SECRET
npm install
npm run db:migrate           # applies prisma/migrations/000_init
npm run db:generate
npm run seed:accounts        # provisions Ethereal mail accounts (MAIL_ACCOUNT_POOL_SIZE)
npm run dev                  # API + inline worker on :5000
```

To scale delivery separately from the API, set `ENABLE_INLINE_WORKER=false`
in `.env` and run the worker as its own process:

```bash
npm run dev:worker
```

Production: `npm run build && npm start` (+ `npm run start:worker` if split out).

### 4.3 Frontend

```bash
cd frontend
cp .env.example .env         # VITE_API_URL=http://localhost:5000
npm install
npm run dev                  # http://localhost:5173
```

### 4.4 Google OAuth setup

1. Create an OAuth 2.0 Client ID (Web application) in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`.
3. Authorized JavaScript origin: `http://localhost:5173`.
4. Put the client ID/secret in `backend/.env`.

Flow: `GET /api/auth/google` → Google consent → `GET
/api/auth/google/callback` (state is a signed JWT checked against a
short-lived cookie for CSRF protection) → upserts the `User` row keyed on
Google's `sub` → issues a JWT → sets it as an httpOnly cookie **and** appends
it as `?session=` on the redirect back to the frontend, which stores it in
`localStorage` and sends it as a `Bearer` token thereafter. This dual
transport means the app keeps working even when frontend and backend are on
different origins in production (e.g. Vercel + Render), where third-party
cookies are unreliable.

---

## 5. Environment variables

See `backend/.env.example` / `frontend/.env.example` for the full list.
Notable ones: `MIN_SPACING_MS` / campaign `spacingMs` (minimum gap between
two sends from the same mail account), `MAX_HOURLY_CAP` / campaign
`hourlyCap` (per-account hourly send ceiling), `WORKER_CONCURRENCY`,
`STALE_CLAIM_MS` (how long a `CLAIMED` message can sit before recovery
treats the claiming worker as dead), `MAX_RECIPIENTS_PER_CAMPAIGN`.

---

## 6. How scheduling works (BullMQ, not cron)

`launchCampaign` creates one `Campaign` row and, in a single Prisma
transaction, one `Message` row per recipient, with `scheduledFor` staggered
by `spacingMs` and `mailAccountId` assigned round-robin across the active
`MailAccount` pool (this pool, not a picker in the compose form, is what
"multiple senders" means here — a campaign automatically spreads load across
every account you've provisioned). Each message then gets exactly one BullMQ
delayed job, `jobId = message.id`, added via `deliveryQueue.addBulk` in
1000-row chunks. **No cron, no node-cron, no Agenda, no polling loop** —
BullMQ's Redis-backed delayed-job timer is the only thing deciding when a
job becomes runnable.

## 7. Idempotency

Two layers, matching the ones the original used, independently written:

1. **BullMQ job identity.** `jobId = message.id`, so re-adding a job for a
   message that already has one queued is a safe no-op at the queue layer.
2. **Atomic conditional claim.** The worker only proceeds to send after
   `UPDATE messages SET status='CLAIMED' ... WHERE status='QUEUED' OR
   (status='CLAIMED' AND claimedAt < staleBefore)` reports it changed a row.
   If two workers ever raced on a redelivered job, only one wins the update
   and the other returns immediately. Already-`DELIVERED`/`FAILED` messages
   are also skipped outright before any of this runs.

## 8. Restart persistence

- **Redis** (Docker volume, AOF enabled) persists BullMQ's delayed-job
  timers, so a plain process restart needs no special handling.
- **Postgres** persists the `Message` row, independent of Redis.
- On boot (`server.ts` and `worker.ts` both call this), `runStartupRecovery`
  handles the harder cases: `reconcileStaleClaims` finds messages stuck in
  `CLAIMED` past `STALE_CLAIM_MS` (a worker died mid-send) — if Ethereal had
  already accepted the send it's marked `DELIVERED`, otherwise it's put back
  to `QUEUED` **and immediately re-enqueued** (not just flipped in the
  database and left to hope something else picks it up). `requeueOrphans`
  separately catches messages whose row was written but whose BullMQ job was
  never placed at all (crash between the Postgres write and `addBulk`).

## 9. Rate limiting (per mail account, spacing + hourly cap, never dropped)

`DeliveryThrottle.reserveSlot` runs one Lua script per attempt that checks
*and* reserves both constraints atomically: a short-lived "spacing" key
(`PTTL` gate) enforcing the minimum gap since the account's last send, and an
hourly counter keyed by UTC clock-hour enforcing the campaign's `hourlyCap`.
If either is unavailable, the script returns how many milliseconds to wait;
the worker calls `job.moveToDelayed(...)` **on the same job** and throws
`DelayedError`, so the message is pushed later without ever creating a
second job or losing its place — never dropped, only deferred.

*Trade-off:* fixed UTC-hour buckets (vs. a sliding window) allow a small
burst right at the hour boundary in exchange for a much simpler, cheaper
Redis footprint — the same trade-off the original made, kept deliberately.

## 10. Handling large campaigns (1000+)

Message rows are chunked into `createMany` calls of 1000 during the single
creation transaction, and BullMQ jobs are chunked into `addBulk` calls of
1000 right after. Nothing about creating 2500 messages blocks longer than
that; nothing about *sending* them serializes beyond what `spacingMs`/
`hourlyCap` intentionally enforce, since every message is its own
independently-timed job picked up by the worker pool
(`WORKER_CONCURRENCY`). Covered in `tests/messageScheduling.test.ts` and
`tests/campaignLaunch.test.ts`.

## 11. Search

`GET /api/campaigns/upcoming?q=...` and `.../delivered?q=...` do a
case-insensitive match across `recipient`, `subject`, and `body`, combined
with pagination. The dashboard's search box drives both tabs through the
same `useMessageFeed` hook.

---

## 12. Testing

```bash
cd backend
npm test
```

- `tests/deliveryThrottle.test.ts` — spacing gate, hourly cap, independent
  accounts, slot release, all against the real Lua script via `ioredis-mock`.
- `tests/messageScheduling.test.ts` — `spacingMs` staggering, round-robin
  account assignment, a 1500-recipient batch with none dropped.
- `tests/campaignLaunch.test.ts` — chunked `addBulk` calls for 2500
  messages, and the "no mail accounts provisioned" error path.
- `tests/validators.test.ts` — zod schema edge cases (past `startAt`,
  malformed recipients, over-limit `hourlyCap`, dedupe + lower-casing).
- `tests/recoveryService.test.ts` — stale-claim reconciliation (both the
  "already delivered" and "needs re-queue" branches) and orphan requeueing.

Prisma, the queue, and mail account lookups are mocked so these run fast and
deterministically without live Postgres/Redis; the throttle test is the
exception, exercising the real Lua script against `ioredis-mock`.

---

## 13. API summary

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/auth/google` | Start Google OAuth |
| `GET` | `/api/auth/google/callback` | OAuth callback |
| `GET` | `/api/auth/session` | Current user |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/campaigns/stats` | Counts by status |
| `GET` | `/api/campaigns/upcoming?q=&limit=&offset=` | Queued + claimed messages |
| `GET` | `/api/campaigns/delivered?q=&limit=&offset=` | Delivered + failed messages |
| `GET` | `/api/campaigns/:id` | One message |
| `POST` | `/api/campaigns` | Launch a campaign |

---

## 14. Sandbox note & other trade-offs

This was built in an offline sandbox with no network access, so
`npm install`, `docker compose up`, and a live Google OAuth handshake could
not be executed here — every file is complete, real code (nothing is a
stub or placeholder), reviewed by hand for consistency, but you should run
`npm install` and the commands above yourself to do a first real build.

- **Ethereal only** — nothing is ever really delivered, matching the
  original and the assignment's intent.
- **Mail account credentials in plain columns** — fine for this scope; a
  production system would encrypt them at rest.
- **No rich-text/attachment editor** — simplified to a plain textarea and a
  recipients-only CSV upload, as noted in §1.
- **Sequential campaign creation** inside one transaction (not parallel
  writes) keeps DB load predictable for very large recipient lists, at the
  cost of a longer `POST /api/campaigns` response time for huge batches.
