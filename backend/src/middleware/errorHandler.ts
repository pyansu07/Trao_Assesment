import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { KitValidationError } from "../validation/kitSchema.js";
import { logger } from "../config/logger.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json(err.toJSON());
    return;
  }
  if (err instanceof KitValidationError) {
    res.status(422).json({
      error: {
        code: "KIT_VALIDATION_FAILED",
        message: "Generated kit failed schema validation",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }
  logger.error("Unhandled error", err instanceof Error ? err.stack : err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}
