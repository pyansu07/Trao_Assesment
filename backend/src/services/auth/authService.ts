import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

const SALT_ROUNDS = 12;
const TOKEN_TTL = "7d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface SessionTokenPayload {
  sub: string; // user id
}

export function signSessionToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies SessionTokenPayload, env.SESSION_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    return jwt.verify(token, env.SESSION_SECRET) as SessionTokenPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "session_token";

// In production the frontend and backend are typically deployed on separate
// domains, so the session cookie must be SameSite=None (+ Secure, required
// by browsers for None) to be sent on cross-site fetch/XHR requests. In local
// dev, localhost:3000 and localhost:4000 are cross-origin but same-site, so
// Lax works and avoids requiring HTTPS locally.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (env.IS_PRODUCTION ? "none" : "lax") as "none" | "lax",
  secure: env.IS_PRODUCTION,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};
