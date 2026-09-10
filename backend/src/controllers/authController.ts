import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../services/auth/authService.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("CONFLICT", "An account with this email already exists");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash });

  const token = signSessionToken(user._id.toString());
  res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  res.status(201).json({ user: { id: user._id, email: user.email } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("AUTH_REQUIRED", "Invalid email or password");
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError("AUTH_REQUIRED", "Invalid email or password");
  }

  const token = signSessionToken(user._id.toString());
  res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  res.json({ user: { id: user._id, email: user.email } });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { ...SESSION_COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.userId).select("email createdAt");
  if (!user) throw new AppError("AUTH_REQUIRED", "Session is invalid or expired");
  res.json({ user: { id: user._id, email: user.email } });
});
