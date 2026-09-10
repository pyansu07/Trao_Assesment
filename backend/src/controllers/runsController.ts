import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getRunOwned } from "../services/jobs/generationJob.js";

export const getRunHandler = asyncHandler(async (req: Request, res: Response) => {
  const run = await getRunOwned(req.userId!, req.params.id);
  res.json({ run });
});
