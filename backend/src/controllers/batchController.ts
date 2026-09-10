import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { BatchUploadSchema } from "../validation/batchSchemas.js";
import { startBatchGeneration, listRunsByBatch } from "../services/jobs/batchJob.js";

export const startBatchHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = Array.isArray(req.body) ? { cases: req.body } : req.body;
  const result = BatchUploadSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    throw new AppError("INVALID_INPUT", message);
  }
  const { batchId, runIds } = await startBatchGeneration(req.userId!, result.data.cases);
  res.status(202).json({ batchId, runIds });
});

export const getBatchHandler = asyncHandler(async (req: Request, res: Response) => {
  const runs = await listRunsByBatch(req.userId!, req.params.batchId);
  res.json({ runs });
});
