// Standalone worker process (no HTTP server) for scaling delivery throughput
// independently of the API. Run alongside server.ts with
// ENABLE_INLINE_WORKER=false to avoid double-processing the same queue.
import { createDeliveryWorker } from "./queue/workerFactory";
import { runStartupRecovery } from "./services/recoveryService";
import { logger } from "./lib/logger";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function main() {
  await runStartupRecovery();
  const worker = createDeliveryWorker();
  logger.info({ concurrency: env.WORKER_CONCURRENCY }, "Standalone delivery worker started");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Worker shutting down...");
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Failed to start worker");
  process.exit(1);
});
