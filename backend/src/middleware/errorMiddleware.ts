import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Validation failed",
        details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof Error) {
    logger.error({ err: err.message }, "Unhandled request error");
    res.status(400).json({ error: { message: err.message } });
    return;
  }

  logger.error({ err }, "Unhandled non-Error thrown");
  res.status(500).json({ error: { message: "Internal server error" } });
}
