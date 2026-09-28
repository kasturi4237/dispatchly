import { Request, Response, NextFunction } from "express";
import { buildConsentUrl, completeGoogleLogin } from "../services/googleAuthService";
import { AuthedRequest } from "../types";
import { env } from "../config/env";
import { SESSION_COOKIE } from "../middleware/requireSession";

const OAUTH_STATE_COOKIE = "dispatchly_oauth_state";

export function startGoogleLogin(_req: Request, res: Response): void {
  const { url, state } = buildConsentUrl();
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(url);
}

export async function finishGoogleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const frontend = env.FRONTEND_URL.replace(/\/+$/, "");
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE);

    if (!code || !state) {
      res.redirect(`${frontend}/login?error=missing_params`);
      return;
    }

    const { token } = await completeGoogleLogin(String(code), String(state), cookieState);

    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Also hand the token back in the redirect URL so a frontend deployed on
    // a different origin (e.g. Vercel + Render) can keep it in memory/local
    // storage and send it as a Bearer token, without depending on 3rd-party
    // cookies working across domains.
    res.redirect(`${frontend}/?session=${encodeURIComponent(token)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed";
    res.redirect(`${frontend}/login?error=${encodeURIComponent(message)}`);
  }
}

export function currentSession(req: AuthedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  res.json({ user: req.user });
}

export function endSession(_req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
}
