import { Worker, DelayedError } from "bullmq";
import { DELIVERY_QUEUE_NAME } from "./deliveryQueue";
import { processDeliveryJob } from "./deliveryProcessor";
import { openRedisConnection } from "../lib/redis";
import { env } from "../config/env";
import { logger } from "../lib/logger";

export function createDeliveryWorker(): Worker {
  const worker = new Worker(
    DELIVERY_QUEUE_NAME,
    async (job, token) => processDeliveryJob(job, token),
    { connection: openRedisConnection(), concurrency: env.WORKER_CONCURRENCY }
  );

  worker.on("failed", (job, err) => {
    if (err instanceof DelayedError) return; // expected: throttle reschedule, not a real failure
    logger.warn({ jobId: job?.id, err: err.message }, "Delivery job failed");
  });
  worker.on("error", (err) => logger.error({ err: err.message }, "Worker connection error"));

  return worker;
}
