import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CALLBACK_URL: z.string().default("http://localhost:5000/api/auth/google/callback"),

  SMTP_HOST: z.string().default("smtp.ethereal.email"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
  MAIL_ACCOUNT_POOL_SIZE: z.coerce.number().min(1).default(4),

  WORKER_CONCURRENCY: z.coerce.number().min(1).default(5),
  MIN_SPACING_MS: z.coerce.number().min(0).default(2000),
  MAX_HOURLY_CAP: z.coerce.number().min(1).default(200),
  MAX_RECIPIENTS_PER_CAMPAIGN: z.coerce.number().min(1).default(10000),
  STALE_CLAIM_MS: z.coerce.number().min(1000).default(300000),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = load();
export type Env = z.infer<typeof schema>;
