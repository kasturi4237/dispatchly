import { describe, it, expect, vi, beforeEach } from "vitest";

const createdRows: any[] = [];

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: any) =>
      fn({
        campaign: { create: async ({ data }: any) => ({ id: "campaign-1", ...data }) },
        message: {
          createMany: async ({ data }: any) => {
            createdRows.push(...data);
            return { count: data.length };
          },
        },
      }),
  },
}));

import { createCampaignWithMessages } from "../src/repositories/messageRepository";

const accounts = [
  { id: "acct-a" } as any,
  { id: "acct-b" } as any,
  { id: "acct-c" } as any,
];

beforeEach(() => {
  createdRows.length = 0;
});

describe("createCampaignWithMessages", () => {
  it("stamps each recipient's scheduledFor spaced by spacingMs starting at startAt", async () => {
    const startAt = new Date("2026-06-01T09:00:00.000Z");
    await createCampaignWithMessages({
      userId: "user-1",
      subject: "Hi",
      body: "Body",
      recipients: ["a@example.com", "b@example.com", "c@example.com", "d@example.com"],
      startAt,
      spacingMs: 3000,
      hourlyCap: 50,
      accounts,
    });

    const times = createdRows.map((r) => r.scheduledFor.getTime());
    expect(times[0]).toBe(startAt.getTime());
    expect(times[1] - times[0]).toBe(3000);
    expect(times[2] - times[1]).toBe(3000);
    expect(times[3] - times[2]).toBe(3000);
  });

  it("assigns mail accounts round-robin across the recipient list", async () => {
    await createCampaignWithMessages({
      userId: "user-1",
      subject: "Hi",
      body: "Body",
      recipients: Array.from({ length: 7 }, (_, i) => `user${i}@example.com`),
      startAt: new Date(),
      spacingMs: 1000,
      hourlyCap: 50,
      accounts,
    });

    const assigned = createdRows.map((r) => r.mailAccountId);
    expect(assigned).toEqual([
      "acct-a",
      "acct-b",
      "acct-c",
      "acct-a",
      "acct-b",
      "acct-c",
      "acct-a",
    ]);
  });

  it("writes every row for a large (1000+) recipient batch without dropping any", async () => {
    const recipients = Array.from({ length: 1500 }, (_, i) => `bulk${i}@example.com`);
    const result = await createCampaignWithMessages({
      userId: "user-1",
      subject: "Big send",
      body: "Body",
      recipients,
      startAt: new Date(),
      spacingMs: 200,
      hourlyCap: 50,
      accounts,
    });

    expect(result.messageIds).toHaveLength(1500);
    expect(createdRows).toHaveLength(1500);
  });
});
