import { listActiveMailAccounts } from "../repositories/mailAccountRepository";
import {
  createCampaignWithMessages,
  markMessagesQueuedAt,
  listUpcomingMessages,
  listDeliveredMessages,
  getMessageById,
  countByStatus,
} from "../repositories/messageRepository";
import { deliveryQueue, jobOptionsFor } from "../queue/deliveryQueue";
import { CreateCampaignInput } from "../validators/campaignValidators";
import { logger } from "../lib/logger";

const ENQUEUE_CHUNK_SIZE = 1000;

export async function launchCampaign(userId: string, input: CreateCampaignInput) {
  const accounts = await listActiveMailAccounts();
  if (accounts.length === 0) {
    throw new Error("No mail accounts are provisioned yet. Run the seed:accounts script first.");
  }

  const { campaign, messageIds, scheduledFor } = await createCampaignWithMessages({
    userId,
    subject: input.subject,
    body: input.body,
    recipients: input.recipients,
    startAt: new Date(input.startAt),
    spacingMs: input.spacingMs,
    hourlyCap: input.hourlyCap,
    accounts,
  });

  const jobs = messageIds.map((id, i) => ({
    name: "deliver",
    data: { messageId: id },
    opts: jobOptionsFor(id, scheduledFor[i]),
  }));

  // Chunking keeps a single very large campaign (1000+) from blocking the
  // event loop or overflowing BullMQ's bulk-add payload in one shot; each
  // chunk still lands as independently-timed delayed jobs.
  for (let i = 0; i < jobs.length; i += ENQUEUE_CHUNK_SIZE) {
    await deliveryQueue.addBulk(jobs.slice(i, i + ENQUEUE_CHUNK_SIZE));
  }
  await markMessagesQueuedAt(messageIds);

  logger.info({ campaignId: campaign.id, count: messageIds.length, userId }, "Campaign launched");
  return { campaignId: campaign.id, messageCount: messageIds.length };
}

export function fetchUpcoming(userId: string, limit: number, offset: number, q?: string) {
  return listUpcomingMessages(userId, limit, offset, q);
}

export function fetchDelivered(userId: string, limit: number, offset: number, q?: string) {
  return listDeliveredMessages(userId, limit, offset, q);
}

export function fetchOne(userId: string, id: string) {
  return getMessageById(userId, id);
}

export function fetchStats(userId: string) {
  return countByStatus(userId);
}
