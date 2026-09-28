import { Job, DelayedError } from "bullmq";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { DeliveryThrottle } from "../services/deliveryThrottle";
import { deliverMessage } from "../services/mailer";
import { DeliveryJobPayload } from "../types";

const throttle = new DeliveryThrottle(redis);

export async function processDeliveryJob(job: Job<DeliveryJobPayload>, token?: string): Promise<void> {
  const { messageId } = job.data;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { campaign: true, mailAccount: true },
  });

  if (!message) {
    logger.warn({ messageId }, "Job fired for a message that no longer exists");
    return;
  }

  // Idempotency, layer 1: a message already resolved (delivered or
  // permanently failed) has nothing left to do. This protects against BullMQ
  // ever re-delivering a job for work that's already finished.
  if (message.status === "DELIVERED" || message.status === "FAILED") {
    return;
  }

  const { campaign, mailAccount } = message;
  const hourlyCap = Math.min(campaign.hourlyCap, env.MAX_HOURLY_CAP);

  const slot = await throttle.reserveSlot(mailAccount.id, campaign.spacingMs, hourlyCap);
  if (!slot.ok) {
    if (!token) throw new Error("Missing worker token; cannot reschedule via moveToDelayed");
    // Push this exact job further into the future rather than creating a
    // second job - the message row, and therefore its identity, never changes.
    await job.moveToDelayed(Date.now() + slot.retryAfterMs, token);
    throw new DelayedError();
  }

  // Idempotency, layer 2: atomically flip QUEUED -> CLAIMED (or reclaim a
  // stale CLAIMED left behind by a worker that crashed mid-send) so that two
  // workers racing on a redelivered job can't both send the same message.
  const staleBefore = new Date(Date.now() - env.STALE_CLAIM_MS);
  const claimed = await prisma.$executeRaw`
    UPDATE "messages"
    SET "status" = 'CLAIMED'::"MessageStatus", "claimedAt" = ${new Date()}, "updatedAt" = ${new Date()}
    WHERE "id" = ${messageId}
      AND ("status" = 'QUEUED'::"MessageStatus" OR ("status" = 'CLAIMED'::"MessageStatus" AND "claimedAt" < ${staleBefore}))
  `;

  if (Number(claimed) === 0) {
    // Someone else already has (or recently had) this - give back the
    // throttle slot we just took and let the other claim run its course.
    await throttle.releaseHourlySlot(mailAccount.id);
    return;
  }

  try {
    const { providerMessageId, previewUrl } = await deliverMessage({
      account: mailAccount,
      to: message.recipient,
      subject: message.subject,
      body: message.body,
    });

    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        providerMessageId,
        previewUrl,
        failureReason: null,
      },
    });
  } catch (err) {
    await throttle.releaseHourlySlot(mailAccount.id);
    const reason = err instanceof Error ? err.message : String(err);
    const maxAttempts = job.opts.attempts ?? 3;
    const nextAttempt = message.attemptCount + 1;

    if (job.attemptsMade + 1 < maxAttempts) {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "QUEUED", attemptCount: nextAttempt, failureReason: reason },
      });
      throw err; // let BullMQ's own backoff/retry handle the next try
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { status: "FAILED", attemptCount: nextAttempt, failureReason: reason },
    });
  }
}
