import { describe, it, expect, vi, beforeEach } from "vitest";

const now = Date.now();
const STALE_MS = 300000; // matches default STALE_CLAIM_MS

const staleDeliveredButUnrecorded = {
  id: "m-1",
  status: "CLAIMED",
  claimedAt: new Date(now - STALE_MS - 1000),
  attemptCount: 1,
  providerMessageId: "provider-abc", // Ethereal accepted it before the crash
  scheduledFor: new Date(now - 10_000),
  createdAt: new Date(now - 20_000),
};

const staleNeverSent = {
  id: "m-2",
  status: "CLAIMED",
  claimedAt: new Date(now - STALE_MS - 1000),
  attemptCount: 1,
  providerMessageId: null,
  scheduledFor: new Date(now - 10_000),
  createdAt: new Date(now - 20_000),
};

const orphanNeverQueued = {
  id: "m-3",
  status: "QUEUED",
  queuedAt: null,
  attemptCount: 0,
  providerMessageId: null,
  scheduledFor: new Date(now + 60_000),
  createdAt: new Date(now - 120_000),
};

const updateCalls: any[] = [];

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    message: {
      findMany: vi.fn(async ({ where }: any) => {
        if (where.status === "CLAIMED") {
          return [staleDeliveredButUnrecorded, staleNeverSent];
        }
        if (where.status === "QUEUED") {
          return [orphanNeverQueued];
        }
        return [];
      }),
      update: vi.fn(async ({ where: { id }, data }: any) => {
        updateCalls.push({ id, data });
        return { id, ...data };
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        for (const id of where.id.in) updateCalls.push({ id, data });
        return { count: where.id.in.length };
      }),
    },
  },
}));

const enqueueCalls: any[] = [];
vi.mock("../src/queue/deliveryQueue", () => ({
  deliveryQueue: {
    addBulk: vi.fn(async (jobs: any[]) => {
      enqueueCalls.push(...jobs);
      return jobs;
    }),
  },
  jobOptionsFor: (messageId: string, runAt: Date) => ({
    jobId: messageId,
    delay: Math.max(0, runAt.getTime() - Date.now()),
  }),
}));

import { runStartupRecovery } from "../src/services/recoveryService";

beforeEach(() => {
  updateCalls.length = 0;
  enqueueCalls.length = 0;
  vi.useRealTimers();
});

describe("runStartupRecovery", () => {
  it("marks a stale claim DELIVERED when the provider had already accepted it", async () => {
    await runStartupRecovery();
    const call = updateCalls.find((c) => c.id === "m-1");
    expect(call?.data.status).toBe("DELIVERED");
  });

  it("hands a stale claim with no provider confirmation back to QUEUED and re-enqueues it immediately", async () => {
    await runStartupRecovery();
    const call = updateCalls.find((c) => c.id === "m-2");
    expect(call?.data.status).toBe("QUEUED");
    expect(enqueueCalls.some((j) => j.data.messageId === "m-2")).toBe(true);
  });

  it("re-enqueues an orphaned QUEUED message that was never actually placed on the queue", async () => {
    const { orphansRequeued } = await runStartupRecovery();
    expect(orphansRequeued).toBe(1);
    expect(enqueueCalls.some((j) => j.data.messageId === "m-3")).toBe(true);
  });
});
