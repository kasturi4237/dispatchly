import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authRoutes } from "./routes/authRoutes";
import { campaignRoutes } from "./routes/campaignRoutes";
import { notFound, errorMiddleware } from "./middleware/errorMiddleware";

const app = express();
app.set("trust proxy", 1);

const allowedFrontend = env.FRONTEND_URL.replace(/\/+$/, "");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/+$/, "");
      const isAllowed =
        clean === allowedFrontend || clean.includes("localhost") || clean.includes("127.0.0.1");
      callback(null, isAllowed);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);

app.use(notFound);
app.use(errorMiddleware);

export default app;
