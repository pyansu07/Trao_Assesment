import { z } from "zod";
import type { Flashcard, Requirement } from "../../validation/kitSchema.js";
import { generateStructured } from "../llm/structuredGenerate.js";
import { FLASHCARD_SYSTEM, buildFlashcardUserContent } from "../../prompts/flashcards.v1.js";

const LlmFlashcardsSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        requirement_ids: z.array(z.string()).default([]),
      }),
    )
    .max(30),
});

export async function generateFlashcards(requirements: Requirement[]): Promise<Flashcard[]> {
  if (requirements.length === 0) return [];

  const validIds = new Set(requirements.map((r) => r.id));
  const maxCards = Math.min(20, Math.max(4, requirements.length));

  const result = await generateStructured({
    systemInstruction: FLASHCARD_SYSTEM,
    userContent: buildFlashcardUserContent(requirements, maxCards),
    schema: LlmFlashcardsSchema,
    temperature: 0.4,
  });

  return result.flashcards.slice(0, maxCards).map((f, index) => ({
    id: `f${index + 1}`,
    front: f.front,
    back: f.back,
    requirement_ids: f.requirement_ids.filter((id) => validIds.has(id)),
    state: "generated" as const,
    practice: { confidence: null, reviewCount: 0, lastReviewedAt: null },
  }));
}
