import { z } from "zod";
import { QuestionCategory, Difficulty } from "./kitSchema.js";

export const AddQuestionSchema = z.object({
  category: QuestionCategory,
  prompt: z.string().trim().min(1).max(2000),
  answer_outline: z.string().trim().min(1).max(4000),
  difficulty: Difficulty,
  requirement_ids: z.array(z.string()).optional(),
});

export const UpdateQuestionSchema = z.object({
  category: QuestionCategory.optional(),
  prompt: z.string().trim().min(1).max(2000).optional(),
  answer_outline: z.string().trim().min(1).max(4000).optional(),
  difficulty: Difficulty.optional(),
  requirement_ids: z.array(z.string()).optional(),
});

export const ReorderQuestionsSchema = z.object({
  ordered_ids: z.array(z.string().min(1)).min(1),
});

export const PinSchema = z.object({
  pinned: z.boolean(),
});

export const RegenerateQuestionsSchema = z.object({
  category: QuestionCategory,
  force: z.boolean().optional().default(false),
});

export const AddFlashcardSchema = z.object({
  front: z.string().trim().min(1).max(500),
  back: z.string().trim().min(1).max(1000),
  requirement_ids: z.array(z.string()).optional(),
});

export const UpdateFlashcardSchema = z.object({
  front: z.string().trim().min(1).max(500).optional(),
  back: z.string().trim().min(1).max(1000).optional(),
  requirement_ids: z.array(z.string()).optional(),
});

export const PracticeFlashcardSchema = z.object({
  confidence: z.enum(["low", "medium", "high"]),
});

export const UpdateCompanyBriefSchema = z.object({
  summary: z.string().trim().min(1).max(2000).optional(),
  what_they_do: z.string().trim().min(1).max(2000).optional(),
});

export const ForceOnlySchema = z.object({
  force: z.boolean().optional().default(false),
});

export const RegenerateScheduleSchema = z.object({
  days: z.coerce.number().int().min(1).max(60).optional(),
});
