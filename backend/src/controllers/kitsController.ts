import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { PipelineInputSchema } from "../validation/pipelineInput.js";
import { startGenerationRun } from "../services/jobs/generationJob.js";
import {
  listKitsOwned,
  getKitOwnedAsJson,
  deleteKitOwned,
  applyKitMutation,
} from "../services/persistence/kitRepository.js";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  pinQuestion,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  pinFlashcard,
  recordFlashcardPractice,
  updateCompanyBrief,
  pinCompanyBrief,
} from "../services/builder/kitBuilder.js";
import {
  regenerateQuestionsSection,
  regenerateFlashcardsSection,
  regenerateCompanyBriefSection,
  regenerateScheduleSection,
} from "../services/builder/regenerationService.js";

export const createKitHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = PipelineInputSchema.parse(req.body);
  const { run, deduplicated } = await startGenerationRun(req.userId!, input);
  res.status(202).json({ runId: run._id, status: run.status, deduplicated });
});

export const listKitsHandler = asyncHandler(async (req: Request, res: Response) => {
  const kits = await listKitsOwned(req.userId!);
  res.json({ kits });
});

export const getKitHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getKitOwnedAsJson(req.userId!, req.params.id);
  res.json(result);
});

export const deleteKitHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteKitOwned(req.userId!, req.params.id);
  res.status(204).send();
});

// --- company brief ---------------------------------------------------------

export const updateCompanyBriefHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => updateCompanyBrief(k, req.body));
  res.json({ kit });
});

export const pinCompanyBriefHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => pinCompanyBrief(k, Boolean(req.body.pinned)));
  res.json({ kit });
});

export const regenerateCompanyBriefHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await regenerateCompanyBriefSection(req.userId!, req.params.id, Boolean(req.body?.force));
  res.json({ kit });
});

// --- questions ---------------------------------------------------------

export const addQuestionHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => addQuestion(k, req.body));
  res.status(201).json({ kit });
});

export const updateQuestionHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => updateQuestion(k, req.params.qid, req.body));
  res.json({ kit });
});

export const deleteQuestionHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => deleteQuestion(k, req.params.qid));
  res.json({ kit });
});

export const reorderQuestionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const orderedIds = req.body.ordered_ids;
  if (!Array.isArray(orderedIds) || orderedIds.some((x) => typeof x !== "string")) {
    throw new AppError("INVALID_INPUT", "ordered_ids must be an array of strings");
  }
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => reorderQuestions(k, orderedIds));
  res.json({ kit });
});

export const pinQuestionHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) =>
    pinQuestion(k, req.params.qid, Boolean(req.body.pinned)),
  );
  res.json({ kit });
});

export const regenerateQuestionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const category = req.body?.category;
  if (!["technical", "behavioural", "system-design", "company-fit"].includes(category)) {
    throw new AppError("INVALID_INPUT", "category must be one of technical, behavioural, system-design, company-fit");
  }
  const kit = await regenerateQuestionsSection(req.userId!, req.params.id, category, Boolean(req.body?.force));
  res.json({ kit });
});

// --- flashcards ---------------------------------------------------------

export const addFlashcardHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => addFlashcard(k, req.body));
  res.status(201).json({ kit });
});

export const updateFlashcardHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => updateFlashcard(k, req.params.fid, req.body));
  res.json({ kit });
});

export const deleteFlashcardHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) => deleteFlashcard(k, req.params.fid));
  res.json({ kit });
});

export const pinFlashcardHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) =>
    pinFlashcard(k, req.params.fid, Boolean(req.body.pinned)),
  );
  res.json({ kit });
});

export const practiceFlashcardHandler = asyncHandler(async (req: Request, res: Response) => {
  const confidence = req.body?.confidence;
  if (!["low", "medium", "high"].includes(confidence)) {
    throw new AppError("INVALID_INPUT", "confidence must be low, medium, or high");
  }
  const kit = await applyKitMutation(req.userId!, req.params.id, (k) =>
    recordFlashcardPractice(k, req.params.fid, confidence),
  );
  res.json({ kit });
});

export const regenerateFlashcardsHandler = asyncHandler(async (req: Request, res: Response) => {
  const kit = await regenerateFlashcardsSection(req.userId!, req.params.id, Boolean(req.body?.force));
  res.json({ kit });
});

// --- schedule ---------------------------------------------------------

export const regenerateScheduleHandler = asyncHandler(async (req: Request, res: Response) => {
  const days = req.body?.days !== undefined ? Number(req.body.days) : undefined;
  if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 60)) {
    throw new AppError("INVALID_INPUT", "days must be an integer between 1 and 60");
  }
  const kit = await regenerateScheduleSection(req.userId!, req.params.id, days);
  res.json({ kit });
});
