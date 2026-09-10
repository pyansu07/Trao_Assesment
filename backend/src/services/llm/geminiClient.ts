import { env } from "../../config/env.js";
import { withRetry } from "../../utils/retry.js";
import { throttleGlobal } from "../../utils/globalRateLimiter.js";

export class LlmError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "LlmError";
    this.retryable = retryable;
  }
}

export interface GenerateTextParams {
  systemInstruction: string;
  userContent: string;
  temperature?: number;
}

const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Thin wrapper over Gemini's generateContent REST endpoint. Handles JSON
 * response mode, timeouts, and classifies rate-limit/server errors as
 * retryable vs. permanent 4xx errors as not retryable.
 */
export async function generateText(params: GenerateTextParams): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.LLM_MODEL}:generateContent?key=${env.LLM_API_KEY}`;

  const body = {
    systemInstruction: { parts: [{ text: params.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: params.userContent }] }],
    generationConfig: {
      temperature: params.temperature ?? 0.4,
      responseMimeType: "application/json",
    },
  };

  return withRetry(
    async () => {
      await throttleGlobal("gemini", env.LLM_MIN_INTERVAL_MS);
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new LlmError("LLM request timed out", true);
        }
        throw new LlmError(`LLM network error: ${err instanceof Error ? err.message : String(err)}`, true);
      } finally {
        clearTimeout(timeoutHandle);
      }

      if (res.status === 429) throw new LlmError("LLM rate limited", true);
      if (res.status >= 500) throw new LlmError(`LLM server error ${res.status}`, true);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new LlmError(`LLM request failed with ${res.status}: ${errText.slice(0, 300)}`, false);
      }

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        promptFeedback?: { blockReason?: string };
      };

      if (json.promptFeedback?.blockReason) {
        throw new LlmError(`LLM blocked the prompt: ${json.promptFeedback.blockReason}`, false);
      }

      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) {
        throw new LlmError("LLM returned an empty response", true);
      }
      return text;
    },
    {
      maxAttempts: 4,
      baseDelayMs: 3000,
      maxDelayMs: 20000,
      isRetryable: (err) => (err instanceof LlmError ? err.retryable : true),
    },
  );
}
