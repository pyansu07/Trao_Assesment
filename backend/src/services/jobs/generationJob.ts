import { GenerationRun, type GenerationRunDoc } from "../../models/GenerationRun.js";
import { runGenerationPipeline } from "../evaluation/pipeline.js";
import { createKit } from "../persistence/kitRepository.js";
import { computeRequestHash } from "../../utils/requestHash.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import type { PipelineInput } from "../../validation/pipelineInput.js";

const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Starts (or, for an identical request already in flight, returns) a
 * generation run. Generation happens in the background; callers poll
 * GET /api/runs/:id for progress.
 *
 * Idempotency is enforced atomically at the database level (a partial
 * unique index on {ownerId, requestHash} scoped to pending/running runs -
 * see models/GenerationRun.ts), not via an application-level "check, then
 * create" - that pattern has a TOCTOU race: two genuinely concurrent
 * identical requests can both pass the check before either write lands,
 * each kicking off its own expensive pipeline. Here we optimistically
 * attempt the create and treat a duplicate-key error as "someone else just
 * won the race" - we look up and return their run instead.
 */
export async function startGenerationRun(
  ownerId: string,
  input: PipelineInput,
): Promise<{ run: GenerationRunDoc; deduplicated: boolean }> {
  const requestHash = computeRequestHash(ownerId, input.jd, input.company_url, input.days);

  let run: GenerationRunDoc;
  let deduplicated = false;
  try {
    run = (await GenerationRun.create({
      ownerId,
      requestHash,
      input,
      status: "pending",
      stages: [],
    })) as unknown as GenerationRunDoc;
  } catch (err) {
    const isDuplicateKey = typeof err === "object" && err !== null && (err as { code?: number }).code === DUPLICATE_KEY_ERROR_CODE;
    if (!isDuplicateKey) throw err;

    const inFlight = await GenerationRun.findOne({
      ownerId,
      requestHash,
      status: { $in: ["pending", "running"] },
    });
    if (!inFlight) {
      // Extremely narrow window: the racing run finished (and its document
      // no longer matches the partial index filter) between our failed
      // insert and this lookup. Safe to just start a fresh run.
      return startGenerationRun(ownerId, input);
    }
    return { run: inFlight as unknown as GenerationRunDoc, deduplicated: true };
  }

  executeRun(run._id.toString(), ownerId, input).catch((err) => {
    logger.error(`Unhandled error executing generation run ${run._id}`, err);
  });

  return { run, deduplicated };
}

async function executeRun(runId: string, ownerId: string, input: PipelineInput): Promise<void> {
  await GenerationRun.findByIdAndUpdate(runId, { status: "running" });
  try {
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
    logger.error(`Generation run ${runId} failed`, message);
    await GenerationRun.findByIdAndUpdate(runId, { status: "failed", error: { code, message } });
  }
}

export async function getRunOwned(ownerId: string, runId: string): Promise<GenerationRunDoc> {
  const run = await GenerationRun.findById(runId);
  if (!run) throw new AppError("NOT_FOUND", "Generation run not found");
  if (run.ownerId.toString() !== ownerId) throw new AppError("FORBIDDEN", "You do not have access to this run");
  return run as unknown as GenerationRunDoc;
}
