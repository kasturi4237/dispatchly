import { Response, NextFunction } from "express";
import { AuthedRequest } from "../types";
import { verifySessionToken } from "../services/googleAuthService";
import { prisma } from "../lib/prisma";

const SESSION_COOKIE = "dispatchly_session";
export { SESSION_COOKIE };

export async function requireSession(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.[SESSION_COOKIE] || bearer;

  if (!token) {
    res.status(401).json({ error: { message: "Sign-in required" } });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.clearCookie(SESSION_COOKIE);
    res.status(401).json({ error: { message: "Session expired, please sign in again" } });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) {
    res.clearCookie(SESSION_COOKIE);
    res.status(401).json({ error: { message: "Account no longer exists" } });
    return;
  }

  req.user = { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
  next();
}
