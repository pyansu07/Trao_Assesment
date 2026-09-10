import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../services/auth/authService.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return next(new AppError("AUTH_REQUIRED", "Authentication required"));
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    return next(new AppError("AUTH_REQUIRED", "Session is invalid or expired"));
  }
  req.userId = payload.sub;
  next();
}
