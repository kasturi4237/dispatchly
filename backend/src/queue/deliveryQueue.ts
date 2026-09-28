import { Queue } from "bullmq";
import { env } from "../config/env";
import { openRedisConnection } from "../lib/redis";
import { DeliveryJobPayload } from "../types";

export const DELIVERY_QUEUE_NAME = "message-delivery";

// Every scheduled message becomes exactly one delayed job here, keyed by the
// message's own id (so re-adding the same message id is a safe no-op rather
// than a duplicate). BullMQ keeps delayed jobs in a Redis-backed timer set,
// which is what makes this a true scheduler rather than a polling cron loop.
export const deliveryQueue = new Queue<DeliveryJobPayload>(DELIVERY_QUEUE_NAME, {
  connection: openRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 2000, age: 86_400 },
    removeOnFail: { count: 2000, age: 86_400 },
  },
});

deliveryQueue.on("error", (err) => {
  console.error("[deliveryQueue] connection error:", err.message);
});

export function jobOptionsFor(messageId: string, runAt: Date) {
  return { jobId: messageId, delay: Math.max(0, runAt.getTime() - Date.now()) };
}
