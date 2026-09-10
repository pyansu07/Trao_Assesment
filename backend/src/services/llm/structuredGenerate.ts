import type { z, ZodTypeDef } from "zod";
import { generateText, LlmError } from "./geminiClient.js";
import { AppError } from "../../utils/AppError.js";

// ---------------------------------------------------------------------------
// Every LLM call in the generation pipeline goes through here: never trust
// raw model output as valid JSON. Parse -> validate against a Zod schema ->
// on failure, retry once with a correction prompt that includes the previous
// invalid output and the exact validation errors -> fail clearly (a
// classified AppError, never an unhandled exception) after max attempts.
// ---------------------------------------------------------------------------

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function safeParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(stripCodeFences(text)) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface StructuredGenerateParams<T> {
  systemInstruction: string;
  userContent: string;
  // Decoupled from the schema's Input type parameter (via `any`) so that T
  // is inferred purely from the schema's Output - fields with z.default(...)
  // stay required in T instead of TS widening them to optional to satisfy
  // Input assignability.
  schema: z.ZodType<T, ZodTypeDef, any>;
  temperature?: number;
  maxCorrectionAttempts?: number;
}

export async function generateStructured<T>(params: StructuredGenerateParams<T>): Promise<T> {
  const { systemInstruction, schema, temperature, maxCorrectionAttempts = 2 } = params;
  let userContent = params.userContent;
  let lastError = "";

  for (let attempt = 0; attempt <= maxCorrectionAttempts; attempt++) {
    let rawText: string;
    try {
      rawText = await generateText({ systemInstruction, userContent, temperature });
    } catch (err) {
      if (err instanceof LlmError) {
        throw new AppError(
          err.retryable ? "LLM_RATE_LIMITED" : "LLM_UNAVAILABLE",
          err.message,
        );
      }
      throw err;
    }

    const parsed = safeParseJson(rawText);
    if (!parsed.ok) {
      lastError = `Response was not valid JSON: ${parsed.error}`;
      userContent = buildCorrectionPrompt(params.userContent, rawText, lastError);
      continue;
    }

    const validated = schema.safeParse(parsed.value);
    if (validated.success) {
      return validated.data;
    }

    lastError = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    userContent = buildCorrectionPrompt(params.userContent, rawText, lastError);
  }

  throw new AppError(
    "LLM_INVALID_OUTPUT",
    `LLM failed to produce schema-valid JSON after ${maxCorrectionAttempts + 1} attempts. Last error: ${lastError}`,
  );
}

function buildCorrectionPrompt(originalPrompt: string, previousOutput: string, validationError: string): string {
  return [
    originalPrompt,
    "",
    "--- CORRECTION REQUIRED ---",
    "Your previous response failed validation and must be corrected. Return ONLY valid JSON matching the",
    "requested structure - no markdown fences, no commentary, no trailing text.",
    `Previous response:\n${previousOutput.slice(0, 2000)}`,
    `Validation error:\n${validationError}`,
    "--- END CORRECTION REQUIRED ---",
  ].join("\n");
}
