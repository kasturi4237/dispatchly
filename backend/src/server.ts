// Combined entrypoint: runs the HTTP API and an in-process delivery worker
// together, which is convenient for a single-service deployment. For
// horizontal scaling, run `npm run start:worker` (worker.ts) as its own
// process/container instead and this server stops spinning up a worker of
// its own automatically - see ENABLE_INLINE_WORKER below.
import app from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { createDeliveryWorker } from "./queue/workerFactory";
import { runStartupRecovery } from "./services/recoveryService";

async function bootstrap() {
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Dispatchly API listening on http://localhost:${env.PORT}`);
  });

  let worker: ReturnType<typeof createDeliveryWorker> | undefined;
  if (process.env.ENABLE_INLINE_WORKER !== "false") {
    worker = createDeliveryWorker();
    logger.info({ concurrency: env.WORKER_CONCURRENCY }, "Inline delivery worker started alongside API");
  }

  runStartupRecovery().catch((err) => logger.warn({ err }, "Startup recovery deferred"));

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down...");
    await worker?.close();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
