import { Router } from "express";
import { startGoogleLogin, finishGoogleLogin, currentSession, endSession } from "../controllers/authController";
import { requireSession } from "../middleware/requireSession";

export const authRoutes = Router();

authRoutes.get("/google", startGoogleLogin);
authRoutes.get("/google/callback", finishGoogleLogin);
authRoutes.get("/session", requireSession, currentSession);
authRoutes.post("/logout", endSession);
