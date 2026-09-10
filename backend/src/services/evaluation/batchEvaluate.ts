import { BatchCaseSchema, type BatchCase } from "../../validation/pipelineInput.js";
import { AppError } from "../../utils/AppError.js";
import type { PipelineOptions, PipelineResult } from "./pipeline.js";

// ---------------------------------------------------------------------------
// The case-iteration logic shared by `npm run evaluate` and its tests. Kept
// separate from the CLI script (scripts/evaluate.ts does file I/O + argv
// parsing only) so "continue after a case fails" can be verified without a
// real network/LLM call - tests inject a fake pipeline runner.
// ---------------------------------------------------------------------------

export interface KitResultEntry {
  id: string;
  status: "ok" | "failed";
  kit: unknown | null;
  error: { code: string; message: string } | null;
}

export type PipelineRunner = (input: BatchCase, opts?: PipelineOptions) => Promise<PipelineResult>;

export interface EvaluateCasesOptions {
  onLog?: (message: string) => void;
}

export async function evaluateCases(
  rawCases: unknown[],
  runPipeline: PipelineRunner,
  opts: EvaluateCasesOptions = {},
): Promise<KitResultEntry[]> {
  const results: KitResultEntry[] = [];

  for (let i = 0; i < rawCases.length; i++) {
    const rawCase = rawCases[i] as Record<string, unknown>;
    const caseId = typeof rawCase?.id === "string" && rawCase.id.trim() ? rawCase.id : `case-${i + 1}`;

    const parsed = BatchCaseSchema.safeParse(rawCase);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
      opts.onLog?.(`[${caseId}] invalid input: ${message}`);
      results.push({ id: caseId, status: "failed", kit: null, error: { code: "INVALID_INPUT", message } });
      continue; // never let one bad case stop the batch
    }

    try {
      const result = await runPipeline(parsed.data, {
        onStage: (event) => opts.onLog?.(`[${caseId}] stage ${event.stage} ${event.status}`),
      });
      results.push({ id: caseId, status: "ok", kit: result.kit, error: null });
    } catch (err) {
      const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
      const message = err instanceof Error ? err.message : String(err);
      opts.onLog?.(`[${caseId}] failed: ${code} - ${message}`);
      results.push({ id: caseId, status: "failed", kit: null, error: { code, message } });
    }
  }

  return results;
}

export function buildOutputDocument(results: KitResultEntry[]) {
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results,
  };
}
