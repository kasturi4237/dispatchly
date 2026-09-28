import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { SessionUser } from "../types";

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);

export function buildConsentUrl(): { url: string; state: string } {
  const state = jwt.sign({ nonce: crypto.randomBytes(16).toString("hex") }, env.JWT_SECRET, {
    expiresIn: "10m",
  });
  const url = client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "profile", "email"],
    prompt: "select_account",
    state,
  });
  return { url, state };
}

function stateLooksValid(state: string, cookieState?: string): boolean {
  if (cookieState && state === cookieState) return true;
  try {
    jwt.verify(state, env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function completeGoogleLogin(
  code: string,
  state: string,
  cookieState?: string
): Promise<{ token: string; user: SessionUser }> {
  if (!stateLooksValid(state, cookieState)) {
    throw new Error("OAuth state validation failed - please try signing in again");
  }

  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new Error("Google did not return an ID token");

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error("Google profile payload was incomplete");

  const record = await prisma.user.upsert({
    where: { googleSub: payload.sub },
    update: {
      name: payload.name ?? payload.email.split("@")[0],
      email: payload.email,
      avatarUrl: payload.picture ?? null,
    },
    create: {
      googleSub: payload.sub,
      name: payload.name ?? payload.email.split("@")[0],
      email: payload.email,
      avatarUrl: payload.picture ?? null,
    },
  });

  const user: SessionUser = { id: record.id, email: record.email, name: record.name, avatarUrl: record.avatarUrl };
  const token = jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
  return { token, user };
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}
