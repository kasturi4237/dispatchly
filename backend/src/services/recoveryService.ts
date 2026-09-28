import { prisma } from "../lib/prisma";
import { deliveryQueue, jobOptionsFor } from "../queue/deliveryQueue";
import { logger } from "../lib/logger";
import { env } from "../config/env";

const CHUNK = 500;

/**
 * A message stuck in CLAIMED past STALE_CLAIM_MS means a worker died between
 * claiming it and recording the outcome. If Ethereal actually accepted the
 * send (providerMessageId is set) we record it as delivered rather than
 * re-sending; otherwise we hand it back to QUEUED (or FAILED once attempts
 * are exhausted) so a future job run can pick it up again.
 */
async function reconcileStaleClaims(): Promise<number> {
  const staleBefore = new Date(Date.now() - env.STALE_CLAIM_MS);
  let total = 0;

  while (true) {
    const stale = await prisma.message.findMany({
      where: { status: "CLAIMED", claimedAt: { lt: staleBefore } },
      take: CHUNK,
      orderBy: { claimedAt: "asc" },
    });
    if (stale.length === 0) break;

    for (const msg of stale) {
      if (msg.providerMessageId) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { status: "DELIVERED", deliveredAt: msg.claimedAt ?? new Date() },
        });
      } else if (msg.attemptCount >= 3) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { status: "FAILED", failureReason: "Worker process was interrupted after all retries were used" },
        });
      } else {
        // Put it straight back to work: flip the row to QUEUED *and* place a
        // fresh delayed job for "right now" in the same step. We deliberately
        // don't just flip the status and leave enqueueing to requeueOrphans()
        // below - that pass only looks at rows old enough to rule out a
        // request that's still mid-flight, which would wrongly skip a claim
        // reset that happens to be recent.
        await deliveryQueue.addBulk([
          { name: "deliver", data: { messageId: msg.id }, opts: jobOptionsFor(msg.id, new Date()) },
        ]);
        await prisma.message.update({
          where: { id: msg.id },
          data: { status: "QUEUED", queuedAt: new Date(), claimedAt: null },
        });
      }
    }

    total += stale.length;
    if (stale.length < CHUNK) break;
  }

  return total;
}

/**
 * Covers a narrower case than reconcileStaleClaims above: a message whose
 * Campaign was created, but the process was killed between the Postgres
 * write and the queue.addBulk call, so it was never handed a job at all
 * (queuedAt stays null forever otherwise). The createdAt cutoff avoids
 * racing a campaign that's still mid-creation in another request right now.
 * Together with reconcileStaleClaims, this is what makes restart durable
 * even if Redis itself lost its data - Postgres is the ultimate source of
 * truth for "this still needs to go out".
 */
async function requeueOrphans(): Promise<number> {
  const cutoff = new Date(Date.now() - 60_000);
  let total = 0;

  while (true) {
    const orphans = await prisma.message.findMany({
      where: { status: "QUEUED", queuedAt: null, createdAt: { lt: cutoff } },
      take: CHUNK,
      orderBy: { createdAt: "asc" },
    });
    if (orphans.length === 0) break;

    await deliveryQueue.addBulk(
      orphans.map((m) => ({ name: "deliver", data: { messageId: m.id }, opts: jobOptionsFor(m.id, m.scheduledFor) }))
    );
    await prisma.message.updateMany({
      where: { id: { in: orphans.map((m) => m.id) } },
      data: { queuedAt: new Date() },
    });

    total += orphans.length;
    if (orphans.length < CHUNK) break;
  }

  return total;
}

export async function runStartupRecovery(): Promise<{ staleReconciled: number; orphansRequeued: number }> {
  const staleReconciled = await reconcileStaleClaims();
  const orphansRequeued = await requeueOrphans();
  if (staleReconciled > 0 || orphansRequeued > 0) {
    logger.info({ staleReconciled, orphansRequeued }, "Startup recovery complete");
  }
  return { staleReconciled, orphansRequeued };
}
