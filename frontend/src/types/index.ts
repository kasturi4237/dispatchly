export type MessageStatus = "QUEUED" | "CLAIMED" | "DELIVERED" | "FAILED";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface MessageRecord {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: MessageStatus;
  scheduledFor: string;
  deliveredAt: string | null;
  attemptCount: number;
  failureReason: string | null;
  previewUrl: string | null;
  mailAccount: { address: string };
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface StatsResponse {
  stats: Record<MessageStatus, number>;
}

export interface LaunchCampaignPayload {
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  spacingMs: number;
  hourlyCap: number;
}

export interface LaunchCampaignResult {
  campaignId: string;
  messageCount: number;
}

export interface ApiFieldError {
  field: string;
  message: string;
}
