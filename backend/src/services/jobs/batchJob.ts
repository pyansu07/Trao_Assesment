import { randomUUID } from "node:crypto";
import { GenerationRun } from "../../models/GenerationRun.js";
import { runGenerationPipeline } from "../evaluation/pipeline.js";
import { createKit } from "../persistence/kitRepository.js";
import { computeRequestHash } from "../../utils/requestHash.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import type { PipelineInput } from "../../validation/pipelineInput.js";

export interface BatchCaseInput extends PipelineInput {
  id?: string;
}

/**
 * Starts batch kit generation from a JSON file/array of cases uploaded via
 * the web app. Cases run sequentially through the SAME pipeline used by
 * single-kit creation and the CLI evaluator (see services/evaluation/pipeline.ts),
 * one at a time, so a slow/rate-limited LLM provider doesn't get hit with
 * concurrent bursts and one case's failure never stops the rest.
 */
export async function startBatchGeneration(
  ownerId: string,
  cases: BatchCaseInput[],
): Promise<{ batchId: string; runIds: string[] }> {
  const batchId = randomUUID();
  const runIds: string[] = [];

  for (const c of cases) {
    const requestHash = computeRequestHash(ownerId, c.jd, c.company_url, c.days);
    const run = await GenerationRun.create({
      ownerId,
      requestHash,
      batchId,
      caseId: c.id ?? null,
      input: { jd: c.jd, company_url: c.company_url, days: c.days },
      status: "pending",
      stages: [],
    });
    runIds.push(run._id.toString());
  }

  processBatchSequentially(ownerId, runIds).catch((err) => {
    logger.error(`Batch ${batchId} failed unexpectedly`, err);
  });

  return { batchId, runIds };
}

async function processBatchSequentially(ownerId: string, runIds: string[]): Promise<void> {
  for (const runId of runIds) {
    const run = await GenerationRun.findById(runId);
    if (!run) continue;

    await GenerationRun.findByIdAndUpdate(runId, { status: "running" });
    try {
      const input = run.input as unknown as PipelineInput;
      const result = await runGenerationPipeline(input, {
        onStage: (event) => {
          GenerationRun.findByIdAndUpdate(runId, {
            $push: { stages: { stage: event.stage, status: event.status, detail: event.detail, at: new Date() } },
          }).catch((err) => logger.warn(`Failed to record stage event for run ${runId}`, err));
        },
      });

      const requestHash = computeRequestHash(ownerId, input.jd, input.company_url, input.days);
      const kitDoc = await createKit(
        ownerId,
        result.kit,
        {
          warnings: result.warnings,
          retrievalFailures: result.retrievalFailures,
          interviewDiscussion: result.interviewDiscussion,
        },
        requestHash,
      );
      await GenerationRun.findByIdAndUpdate(runId, { status: "completed", kitId: kitDoc._id });
    } catch (err) {
      const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Batch case (run ${runId}) failed`, message);
      await GenerationRun.findByIdAndUpdate(runId, { status: "failed", error: { code, message } });
    }
  }
}

export async function listRunsByBatch(ownerId: string, batchId: string) {
  return GenerationRun.find({ ownerId, batchId }).sort({ createdAt: 1 }).lean();
}
