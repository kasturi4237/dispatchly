import { Redis } from "ioredis";

/**
 * Atomically decides whether a mail account may send *right now*, enforcing
 * two independent constraints in one round trip so there's no race between
 * checking and reserving:
 *
 *   1. Spacing: KEYS[1] holds a short-lived marker set right after a send;
 *      while it exists, the account is inside its mandatory cool-down.
 *   2. Hourly cap: KEYS[2] is a counter for the current UTC clock-hour;
 *      once it reaches the cap, no more sends are allowed until the bucket
 *      rolls over.
 *
 * Returns 0 when the caller may proceed (and has already reserved both the
 * spacing marker and the hourly slot). Returns a positive number of
 * milliseconds the caller must wait before trying again otherwise.
 */
const THROTTLE_SCRIPT = `
local spacingKey = KEYS[1]
local hourlyKey = KEYS[2]
local spacingMs = tonumber(ARGV[1])
local hourlyCap = tonumber(ARGV[2])
local msLeftInHour = tonumber(ARGV[3])

local spacingTtl = redis.call('PTTL', spacingKey)
if spacingTtl > 0 then
  return spacingTtl
end

local sentThisHour = tonumber(redis.call('GET', hourlyKey) or '0')
if sentThisHour >= hourlyCap then
  if msLeftInHour <= 0 then
    return 1000
  end
  return msLeftInHour
end

local updated = redis.call('INCR', hourlyKey)
if updated == 1 then
  redis.call('EXPIRE', hourlyKey, 7200)
end

if spacingMs > 0 then
  redis.call('PSETEX', spacingKey, spacingMs, '1')
end

return 0
`;

function utcHourBucket(at: Date): { bucketId: string; msRemainingInHour: number } {
  const y = at.getUTCFullYear();
  const mo = String(at.getUTCMonth() + 1).padStart(2, "0");
  const d = String(at.getUTCDate()).padStart(2, "0");
  const h = String(at.getUTCHours()).padStart(2, "0");
  const bucketId = `${y}${mo}${d}${h}`;

  const nextHour = new Date(Date.UTC(y, at.getUTCMonth(), at.getUTCDate(), at.getUTCHours() + 1, 0, 0, 0));
  const msRemainingInHour = Math.max(1000, nextHour.getTime() - at.getTime());
  return { bucketId, msRemainingInHour };
}

export class DeliveryThrottle {
  constructor(private redis: Redis) {}

  /** Attempts to reserve a send slot for `accountId` right now. */
  async reserveSlot(
    accountId: string,
    spacingMs: number,
    hourlyCap: number
  ): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
    const now = new Date();
    const { bucketId, msRemainingInHour } = utcHourBucket(now);

    const spacingKey = `throttle:spacing:${accountId}`;
    const hourlyKey = `throttle:hourly:${accountId}:${bucketId}`;

    const waitMs = (await this.redis.eval(
      THROTTLE_SCRIPT,
      2,
      spacingKey,
      hourlyKey,
      String(spacingMs),
      String(hourlyCap),
      String(msRemainingInHour)
    )) as number;

    if (waitMs > 0) return { ok: false, retryAfterMs: waitMs };
    return { ok: true };
  }

  /** Gives back an hourly slot that was reserved but ultimately not used
   * (e.g. the send itself failed before delivery was confirmed). */
  async releaseHourlySlot(accountId: string, at: Date = new Date()): Promise<void> {
    const { bucketId } = utcHourBucket(at);
    const key = `throttle:hourly:${accountId}:${bucketId}`;
    const remaining = await this.redis.decr(key);
    if (remaining <= 0) await this.redis.del(key);
  }
}
