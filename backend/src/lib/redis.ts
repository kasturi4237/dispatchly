import IORedis, { Redis } from "ioredis";
import { env } from "../config/env";

/** Parses a redis:// URL into an ioredis connection with the options BullMQ requires. */
export function openRedisConnection(): Redis {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export const redis = openRedisConnection();
