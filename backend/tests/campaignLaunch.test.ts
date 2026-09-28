import { describe, it, expect, vi, beforeEach } from "vitest";

const accounts = [{ id: "acct-a" }, { id: "acct-b" }] as any;

vi.mock("../src/repositories/mailAccountRepository", () => ({
  listActiveMailAccounts: vi.fn(async () => accounts),
}));

let nextMessageIds: string[] = [];
let nextScheduledFor: Date[] = [];
const markQueuedCalls: string[][] = [];

vi.mock("../src/repositories/messageRepository", () => ({
  createCampaignWithMessages: vi.fn(async () => ({
    campaign: { id: "campaign-x" },
    messageIds: nextMessageIds,
    scheduledFor: nextScheduledFor,
  })),
  markMessagesQueuedAt: vi.fn(async (ids: string[]) => {
    markQueuedCalls.push(ids);
  }),
}));

const addBulkCalls: any[][] = [];
vi.mock("../src/queue/deliveryQueue", () => ({
  deliveryQueue: {
    addBulk: vi.fn(async (jobs: any[]) => {
      addBulkCalls.push(jobs);
      return jobs;
    }),
  },
  jobOptionsFor: (messageId: string, runAt: Date) => ({
    jobId: messageId,
    delay: Math.max(0, runAt.getTime() - Date.now()),
  }),
}));

import { launchCampaign } from "../src/services/campaignService";

beforeEach(() => {
  addBulkCalls.length = 0;
  markQueuedCalls.length = 0;
});

function makeIds(n: number) {
  return Array.from({ length: n }, (_, i) => `msg-${i}`);
}

describe("launchCampaign", () => {
  it("enqueues one job per message for a small campaign in a single addBulk call", async () => {
    nextMessageIds = makeIds(5);
    nextScheduledFor = nextMessageIds.map(() => new Date(Date.now() + 60_000));

    const result = await launchCampaign("user-1", {
      subject: "Hi",
      body: "Body",
      recipients: nextMessageIds.map((_, i) => `r${i}@example.com`),
      startAt: new Date().toISOString(),
      spacingMs: 1000,
      hourlyCap: 20,
    });

    expect(result.messageCount).toBe(5);
    expect(addBulkCalls).toHaveLength(1);
    expect(addBulkCalls[0]).toHaveLength(5);
    expect(markQueuedCalls[0]).toHaveLength(5);
  });

  it("splits a 1000+ message campaign into multiple addBulk chunks", async () => {
    nextMessageIds = makeIds(2500);
    nextScheduledFor = nextMessageIds.map(() => new Date(Date.now() + 60_000));

    const result = await launchCampaign("user-1", {
      subject: "Big send",
      body: "Body",
      recipients: nextMessageIds.map((_, i) => `bulk${i}@example.com`),
      startAt: new Date().toISOString(),
      spacingMs: 500,
      hourlyCap: 100,
    });

    expect(result.messageCount).toBe(2500);
    // chunk size is 1000, so 2500 messages -> 3 addBulk calls (1000/1000/500)
    expect(addBulkCalls).toHaveLength(3);
    expect(addBulkCalls.reduce((sum, c) => sum + c.length, 0)).toBe(2500);
  });

  it("throws a clear error when no mail accounts are provisioned", async () => {
    const mailAccountRepo = await import("../src/repositories/mailAccountRepository");
    (mailAccountRepo.listActiveMailAccounts as any).mockResolvedValueOnce([]);

    await expect(
      launchCampaign("user-1", {
        subject: "Hi",
        body: "Body",
        recipients: ["a@example.com"],
        startAt: new Date().toISOString(),
        spacingMs: 1000,
        hourlyCap: 20,
      })
    ).rejects.toThrow(/no mail accounts/i);
  });
});
