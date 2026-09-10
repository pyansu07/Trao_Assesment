import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../utils/AppError.js";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
      return next(new AppError("INVALID_INPUT", message));
    }
    req.body = result.data;
    next();
  };
}
