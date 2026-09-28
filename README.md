# Dispatchly

**Schedule email campaigns that go out on time, at a controlled pace, and survive restarts.**

Dispatchly is a full-stack email scheduling app. You sign in with Google, write a message, add recipients (typed, pasted, or uploaded as a CSV), choose a start time, and Dispatchly delivers each email at the right moment. Delivery is spread across several sender accounts with per-account spacing and hourly limits, and nothing is lost if the server restarts.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Features

**Scheduling**
- Schedule one email or thousands in a single campaign
- Recipients from pasted text or a CSV/TXT upload, with live valid and invalid counts
- Choose the start time, the delay between sends, and an hourly limit per sender
- Every email is its own delayed job, so there is no cron and no polling loop

**Reliable delivery**
- Several sender accounts share the load automatically (round-robin)
- Minimum spacing between sends and an hourly cap, enforced per sender in Redis
- When a limit is hit, the email is pushed to a later time. It is never dropped
- An email is never sent twice, even if a job is redelivered or a worker crashes
- Failed sends retry automatically with exponential backoff

**Dashboard**
- Google sign-in, with your name, email and avatar shown in the header
- Upcoming and Delivered tabs, live status counts, and search across recipient, subject and body
- Message detail panel with the failure reason and an Ethereal preview link
- Loading, empty, error and success states throughout
- Works on desktop and mobile

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL with Prisma ORM |
| Queue | BullMQ on Redis |
| Email | Nodemailer with Ethereal SMTP (test inboxes) |
| Auth | Google OAuth 2.0 (`google-auth-library`) and signed JWT sessions |
| Validation | Zod |
| Tests | Vitest |

---

## How it works

```
 Browser (React)
      |  REST + JWT
      v
 Express API ------> PostgreSQL   (users, campaigns, messages, sender accounts)
      |
      |  one delayed job per message
      v
 Redis / BullMQ  <-----> Worker  ------> Ethereal SMTP
      ^                     |
      |                     +--> Redis throttle (spacing + hourly cap)
      +---- startup recovery reads Postgres and re-queues anything unfinished
```

### Scheduling
Launching a campaign creates one `Campaign` and one `Message` row per recipient in a single database transaction. Each message gets a scheduled time (`startAt + index x delay`) and a sender account chosen round-robin. Then one BullMQ delayed job is added per message, in chunks of 1000. BullMQ keeps delayed jobs in Redis, so timing is handled by the queue itself.

### Throttling
Just before sending, the worker asks a small Lua script in Redis whether that sender may send right now. The script checks and reserves two limits in one atomic step:

1. **Spacing:** a short-lived key that blocks the sender until the minimum gap has passed.
2. **Hourly cap:** a counter for the current UTC hour.

If either limit blocks the send, the script returns how long to wait. The worker then moves the same job to that later time. Because the check and the reservation happen together, many workers can run in parallel without exceeding a limit.

### Idempotency
Two safeguards prevent duplicate sends:

- The job ID is the message ID, so adding the same job twice has no effect.
- Before sending, the worker atomically flips the row from `QUEUED` to `CLAIMED`. If the update changes nothing, another worker already has it and this one stops.

Messages that are already delivered or failed are skipped outright.

### Surviving restarts
Redis (with append-only persistence) keeps the delayed jobs, and Postgres keeps the message state. On startup, a recovery pass also handles the edge cases:

- A message stuck in `CLAIMED` past the timeout means a worker died mid-send. If the provider had accepted it, it is marked delivered. Otherwise it goes back in the queue.
- A message that was saved but never queued, because the API was killed in between, is queued now.

---

## Project structure

```
dispatchly/
├── docker-compose.yml            Postgres and Redis for local development
├── backend/
│   ├── prisma/                   schema, SQL migration, seed script
│   ├── src/
│   │   ├── config/               validated environment config
│   │   ├── controllers/  routes/  middleware/  validators/
│   │   ├── repositories/         database access
│   │   ├── services/             campaign logic, throttle, mailer, Google auth, recovery
│   │   ├── queue/                queue, job processor, worker factory
│   │   ├── app.ts                Express app
│   │   ├── server.ts             API plus inline worker
│   │   └── worker.ts             standalone worker
│   └── tests/
└── frontend/
    └── src/
        ├── components/           top nav, message list, stat cards, drawers, compose form
        ├── pages/                login and dashboard
        ├── hooks/                auth and message feed
        └── lib/                  API client, CSV parsing, date helpers
```

---

## Getting started

### Prerequisites
- Node.js 20 or newer
- Docker and Docker Compose
- A Google Cloud OAuth client (see step 4)

### 1. Start Postgres and Redis
```bash
docker compose up -d
```

### 2. Set up the backend
```bash
cd backend
cp .env.example .env        # then fill in the Google credentials
npm install
npm run db:migrate          # create the tables
npm run db:generate         # generate the Prisma client
npm run seed:accounts       # create the Ethereal sender accounts
npm run dev                 # API and worker on http://localhost:5000
```

### 3. Set up the frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

### 4. Google OAuth
1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type *Web application*.
2. Add `http://localhost:5173` as an authorized JavaScript origin.
3. Add `http://localhost:5000/api/auth/google/callback` as an authorized redirect URI.
4. Copy the client ID and secret into `backend/.env`.

### Running the worker separately
To scale delivery independently of the API, set `ENABLE_INLINE_WORKER=false` in `backend/.env`, then run these in two terminals:
```bash
npm run dev          # API only
npm run dev:worker   # worker only
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | Set to `production` when deployed |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed origin for CORS and the sign-in redirect |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `REDIS_URL` | required | Redis connection string |
| `JWT_SECRET` | required | At least 16 characters. Signs sessions |
| `GOOGLE_CLIENT_ID` | | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5000/api/auth/google/callback` | Must match the Google console exactly |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Ethereal defaults | SMTP fallback settings |
| `MAIL_ACCOUNT_POOL_SIZE` | `4` | Number of sender accounts the seed script creates |
| `ENABLE_INLINE_WORKER` | `true` | Set to `false` to run the worker as its own process |
| `WORKER_CONCURRENCY` | `5` | Jobs processed in parallel |
| `MIN_SPACING_MS` | `2000` | Smallest allowed delay between sends |
| `MAX_HOURLY_CAP` | `200` | Largest allowed hourly limit per sender |
| `MAX_RECIPIENTS_PER_CAMPAIGN` | `10000` | Upper bound on campaign size |
| `STALE_CLAIM_MS` | `300000` | How long a claimed message can sit before recovery steps in |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the API, for example `http://localhost:5000` |

---

## API reference

All `/api/campaigns` routes require a signed-in user (session cookie or `Authorization: Bearer <token>`).

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/auth/google` | Start Google sign-in |
| `GET` | `/api/auth/google/callback` | Google redirect target |
| `GET` | `/api/auth/session` | Current user |
| `POST` | `/api/auth/logout` | Sign out |
| `POST` | `/api/campaigns` | Launch a campaign |
| `GET` | `/api/campaigns/stats` | Message counts by status |
| `GET` | `/api/campaigns/upcoming` | Queued and sending messages |
| `GET` | `/api/campaigns/delivered` | Delivered and failed messages |
| `GET` | `/api/campaigns/:id` | One message |

The list endpoints accept `limit`, `offset` and `q` (search).

**Launch a campaign**
```http
POST /api/campaigns
Content-Type: application/json

{
  "subject": "Hello",
  "body": "Message text",
  "recipients": ["a@example.com", "b@example.com"],
  "startAt": "2026-10-01T09:00:00.000Z",
  "spacingMs": 2000,
  "hourlyCap": 100
}
```

Errors return `{ "error": { "message": "...", "details": [...] } }` with a suitable status code.

---

## Testing

```bash
cd backend
npm test
```

The suite covers:
- **Throttle:** spacing, hourly cap, separate senders, releasing a slot
- **Scheduling:** staggered times, round-robin sender assignment, campaigns of 1500 or more
- **Campaign launch:** chunked queueing for 2500 messages, and the case where no sender accounts exist
- **Validation:** past start times, invalid addresses, limits, de-duplication
- **Recovery:** stale claims and unqueued messages after a crash

Database and queue calls are mocked so the tests run without infrastructure. The throttle tests run the real Lua script against `ioredis-mock`.

---

## Deployment

A typical free-tier setup:

| Part | Service |
|---|---|
| Frontend | Vercel (root directory `frontend`, env `VITE_API_URL`) |
| API and worker | Render web service (root directory `backend`) |
| PostgreSQL | Neon (use the direct connection string) |
| Redis | Render Key Value, with eviction set to `noeviction` |

**Render settings**
- Build command: `npm install --include=dev && npm run build`
- Start command: `npx prisma migrate deploy && node dist/server.js`
- Set `NODE_ENV=production` and all the backend variables above.

**After deploying**
1. Run `npm run seed:accounts` once against the production database to create sender accounts.
2. Set `FRONTEND_URL` on Render to the exact Vercel URL, with no trailing slash.
3. Add the Vercel URL and the API callback URL to the Google OAuth client.
4. Use a free uptime monitor on `/health`. Free Render instances sleep when idle, and scheduled emails only send while the service is awake.

