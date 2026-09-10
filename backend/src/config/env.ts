import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/interview_prep_kit"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().default("gemini-flash-latest"),
  // Minimum spacing enforced between consecutive LLM calls, to stay under a
  // free-tier provider's requests-per-minute limit proactively rather than
  // bursting and relying on retry/backoff after a 429.
  LLM_MIN_INTERVAL_MS: z.coerce.number().int().min(0).default(4500),
  SEARCH_API_KEY: z.string().optional().default(""),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  BACKEND_URL: z.string().default("http://localhost:4000"),
  // "evaluation" allows retrieval of localhost/private URLs (needed by the
  // batch evaluator and local dev/tests against fixture sites). "production"
  // enforces strict SSRF protections and rejects private/loopback targets.
  RETRIEVAL_ENV: z.enum(["evaluation", "production"]).default("development" as never).optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check .env against .env.example");
}

const data = parsed.data;

// RETRIEVAL_ENV defaults: explicit env var wins; otherwise infer a safe
// default from NODE_ENV so local dev/test doesn't need to set it manually.
const retrievalEnv: "evaluation" | "production" =
  (process.env.RETRIEVAL_ENV as "evaluation" | "production" | undefined) ??
  (data.NODE_ENV === "production" ? "production" : "evaluation");

export const env = {
  ...data,
  RETRIEVAL_ENV: retrievalEnv,
  IS_PRODUCTION: data.NODE_ENV === "production",
};
