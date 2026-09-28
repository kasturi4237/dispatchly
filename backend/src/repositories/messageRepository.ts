import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { MailAccount, MessageStatus, Prisma } from "@prisma/client";

const WRITE_CHUNK_SIZE = 1000;

export interface NewCampaignInput {
  userId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: Date;
  spacingMs: number;
  hourlyCap: number;
  accounts: MailAccount[];
}

/**
 * Creates one Campaign row plus one Message row per recipient inside a single
 * transaction. Recipients are fanned out across the mail account pool
 * round-robin, and each message's scheduledFor is staggered by `spacingMs`
 * starting at `startAt` - this is the entire "batch scheduling" model: a
 * large campaign is just N independent, individually-timed rows.
 */
export async function createCampaignWithMessages(input: NewCampaignInput) {
  const startMs = input.startAt.getTime();

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        userId: input.userId,
        spacingMs: input.spacingMs,
        hourlyCap: input.hourlyCap,
        startAt: input.startAt,
      },
    });

    const rows = input.recipients.map((recipient, index) => ({
      id: crypto.randomUUID(),
      userId: input.userId,
      campaignId: campaign.id,
      mailAccountId: input.accounts[index % input.accounts.length].id,
      recipient,
      subject: input.subject,
      body: input.body,
      scheduledFor: new Date(startMs + index * input.spacingMs),
      status: MessageStatus.QUEUED,
    }));

    for (let i = 0; i < rows.length; i += WRITE_CHUNK_SIZE) {
      await tx.message.createMany({ data: rows.slice(i, i + WRITE_CHUNK_SIZE) });
    }

    return { campaign, messageIds: rows.map((r) => r.id), scheduledFor: rows.map((r) => r.scheduledFor) };
  });
}

export async function markMessagesQueuedAt(messageIds: string[]) {
  if (messageIds.length === 0) return;
  const now = new Date();
  for (let i = 0; i < messageIds.length; i += WRITE_CHUNK_SIZE) {
    const chunk = messageIds.slice(i, i + WRITE_CHUNK_SIZE);
    await prisma.message.updateMany({ where: { id: { in: chunk } }, data: { queuedAt: now } });
  }
}

function searchFilter(q?: string): Prisma.MessageWhereInput {
  if (!q?.trim()) return {};
  const term = q.trim();
  return {
    OR: [
      { recipient: { contains: term, mode: "insensitive" } },
      { subject: { contains: term, mode: "insensitive" } },
      { body: { contains: term, mode: "insensitive" } },
    ],
  };
}

export async function listUpcomingMessages(userId: string, limit: number, offset: number, q?: string) {
  const where: Prisma.MessageWhereInput = {
    userId,
    status: { in: [MessageStatus.QUEUED, MessageStatus.CLAIMED] },
    ...searchFilter(q),
  };
  const [total, items] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { scheduledFor: "asc" },
      include: { mailAccount: { select: { address: true } } },
    }),
  ]);
  return { items, total };
}

export async function listDeliveredMessages(userId: string, limit: number, offset: number, q?: string) {
  const where: Prisma.MessageWhereInput = {
    userId,
    status: { in: [MessageStatus.DELIVERED, MessageStatus.FAILED] },
    ...searchFilter(q),
  };
  const [total, items] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ deliveredAt: "desc" }, { updatedAt: "desc" }],
      include: { mailAccount: { select: { address: true } } },
    }),
  ]);
  return { items, total };
}

export async function getMessageById(userId: string, id: string) {
  return prisma.message.findFirst({
    where: { id, userId },
    include: { mailAccount: { select: { address: true } } },
  });
}

export async function countByStatus(userId: string) {
  const grouped = await prisma.message.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = { QUEUED: 0, CLAIMED: 0, DELIVERED: 0, FAILED: 0 };
  for (const row of grouped) counts[row.status] = row._count._all;
  return counts;
}
