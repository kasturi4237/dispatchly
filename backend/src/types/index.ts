import { Request } from "express";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

export interface DeliveryJobPayload {
  messageId: string;
}
