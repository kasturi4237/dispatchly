import { describe, it, expect, beforeEach } from "vitest";
import RedisMock from "ioredis-mock";
import { DeliveryThrottle } from "../src/services/deliveryThrottle";

describe("DeliveryThrottle", () => {
  let redis: any;
  let throttle: DeliveryThrottle;

  beforeEach(() => {
    redis = new RedisMock();
    throttle = new DeliveryThrottle(redis);
  });

  it("grants the first send for an account with no prior history", async () => {
    const result = await throttle.reserveSlot("acct-1", 1000, 10);
    expect(result.ok).toBe(true);
  });

  it("rejects a second send before the spacing window has elapsed", async () => {
    await throttle.reserveSlot("acct-2", 5000, 10);
    const second = await throttle.reserveSlot("acct-2", 5000, 10);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.retryAfterMs).toBeGreaterThan(0);
      expect(second.retryAfterMs).toBeLessThanOrEqual(5000);
    }
  });

  it("stops granting sends once the hourly cap is reached, independent of spacing", async () => {
    // spacing of 0 isolates the hourly-cap behaviour from the spacing guard
    const cap = 3;
    for (let i = 0; i < cap; i++) {
      const r = await throttle.reserveSlot("acct-3", 0, cap);
      expect(r.ok).toBe(true);
    }
    const overflow = await throttle.reserveSlot("acct-3", 0, cap);
    expect(overflow.ok).toBe(false);
  });

  it("tracks each mail account's throttle independently", async () => {
    await throttle.reserveSlot("acct-4", 0, 1);
    const other = await throttle.reserveSlot("acct-5", 0, 1);
    expect(other.ok).toBe(true);
  });

  it("releaseHourlySlot frees up capacity for a subsequent attempt", async () => {
    const cap = 1;
    await throttle.reserveSlot("acct-6", 0, cap);
    const blocked = await throttle.reserveSlot("acct-6", 0, cap);
    expect(blocked.ok).toBe(false);

    await throttle.releaseHourlySlot("acct-6");
    const afterRelease = await throttle.reserveSlot("acct-6", 0, cap);
    expect(afterRelease.ok).toBe(true);
  });
});
