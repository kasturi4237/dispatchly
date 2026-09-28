import { z } from "zod";
import { env } from "../config/env";

export const createCampaignSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject is too long"),
  body: z.string().trim().min(1, "Message body is required"),
  recipients: z
    .array(z.string().trim().email("One or more recipient addresses are invalid"))
    .min(1, "At least one recipient is required")
    .max(
      env.MAX_RECIPIENTS_PER_CAMPAIGN,
      `Cannot exceed ${env.MAX_RECIPIENTS_PER_CAMPAIGN} recipients per campaign`
    )
    .transform((list) => Array.from(new Set(list.map((e) => e.toLowerCase())))),
  startAt: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), "startAt must be a valid date")
    .refine(
      (v) => new Date(v).getTime() > Date.now() - 60_000,
      "startAt cannot be in the past"
    ),
  spacingMs: z.coerce
    .number()
    .int()
    .min(env.MIN_SPACING_MS, `spacingMs must be at least ${env.MIN_SPACING_MS}ms`)
    .max(86_400_000, "spacingMs cannot exceed 24 hours"),
  hourlyCap: z.coerce
    .number()
    .int()
    .min(1, "hourlyCap must be at least 1")
    .max(env.MAX_HOURLY_CAP, `hourlyCap cannot exceed ${env.MAX_HOURLY_CAP}`),
});

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type PageQuery = z.infer<typeof pageQuerySchema>;
