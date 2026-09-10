import type { Kit, Question, Flashcard, QuestionCategoryValue, DifficultyValue } from "../../validation/kitSchema.js";
import { computeUncoveredRequirementIds } from "../coverage/coverageChecker.js";
import { nextId } from "../../utils/ids.js";
import { AppError } from "../../utils/AppError.js";

// ---------------------------------------------------------------------------
// Pure, testable functions that transform an in-memory Kit. The persistence
// layer loads a Kit, applies exactly one of these, re-validates the result
// against the schema, and saves. None of these functions touch the database.
//
// State model:
//   generated -> safe to replace wholesale during section regeneration
//   edited    -> user touched it; preserved during regeneration
//   pinned    -> explicitly protected; always preserved unless the user
//                deletes it directly
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function recomputeCoverage(kit: Kit): Kit {
  kit.coverage.uncovered_requirement_ids = computeUncoveredRequirementIds(kit.role.requirements, kit.questions);
  return kit;
}

/** Removes schedule references to question ids that no longer exist, preserving day structure/edits otherwise. */
function pruneDanglingScheduleReferences(kit: Kit): Kit {
  const validQuestionIds = new Set(kit.questions.map((q) => q.id));
  kit.schedule.days = kit.schedule.days.map((day) => ({
    ...day,
    question_ids: day.question_ids.filter((qid) => validQuestionIds.has(qid)),
  }));
  return kit;
}

// --- questions ---------------------------------------------------------

export function addQuestion(
  kit: Kit,
  input: { category: QuestionCategoryValue; prompt: string; answer_outline: string; difficulty: DifficultyValue; requirement_ids?: string[] },
): Kit {
  const next = clone(kit);
  const validReqIds = new Set(next.role.requirements.map((r) => r.id));
  const requirement_ids = (input.requirement_ids ?? []).filter((id) => validReqIds.has(id));
  const question: Question = {
    id: nextId("q", next.questions.map((q) => q.id)),
    requirement_ids,
    category: input.category,
    prompt: input.prompt,
    answer_outline: input.answer_outline,
    difficulty: input.difficulty,
    state: "edited",
  };
  next.questions.push(question);
  return recomputeCoverage(next);
}

export function updateQuestion(kit: Kit, id: string, patch: Partial<Pick<Question, "prompt" | "answer_outline" | "category" | "difficulty" | "requirement_ids">>): Kit {
  const next = clone(kit);
  const q = next.questions.find((x) => x.id === id);
  if (!q) throw new AppError("NOT_FOUND", `Question ${id} not found`);
  if (patch.requirement_ids) {
    const validReqIds = new Set(next.role.requirements.map((r) => r.id));
    q.requirement_ids = patch.requirement_ids.filter((rid) => validReqIds.has(rid));
  }
  if (patch.prompt !== undefined) q.prompt = patch.prompt;
  if (patch.answer_outline !== undefined) q.answer_outline = patch.answer_outline;
  if (patch.category !== undefined) q.category = patch.category;
  if (patch.difficulty !== undefined) q.difficulty = patch.difficulty;
  if (q.state !== "pinned") q.state = "edited";
  return recomputeCoverage(next);
}

export function deleteQuestion(kit: Kit, id: string): Kit {
  const next = clone(kit);
  const exists = next.questions.some((q) => q.id === id);
  if (!exists) throw new AppError("NOT_FOUND", `Question ${id} not found`);
  next.questions = next.questions.filter((q) => q.id !== id);
  pruneDanglingScheduleReferences(next);
  return recomputeCoverage(next);
}

export function reorderQuestions(kit: Kit, orderedIds: string[]): Kit {
  const next = clone(kit);
  const currentIds = new Set(next.questions.map((q) => q.id));
  const newIds = new Set(orderedIds);
  if (currentIds.size !== newIds.size || [...currentIds].some((id) => !newIds.has(id))) {
    throw new AppError("INVALID_INPUT", "reorder must include exactly the current set of question ids");
  }
  const byId = new Map(next.questions.map((q) => [q.id, q]));
  next.questions = orderedIds.map((id) => byId.get(id)!);
  return next;
}

export function pinQuestion(kit: Kit, id: string, pinned: boolean): Kit {
  const next = clone(kit);
  const q = next.questions.find((x) => x.id === id);
  if (!q) throw new AppError("NOT_FOUND", `Question ${id} not found`);
  q.state = pinned ? "pinned" : "edited";
  return next;
}

// --- flashcards ----------------------------------------------------------

export function addFlashcard(kit: Kit, input: { front: string; back: string; requirement_ids?: string[] }): Kit {
  const next = clone(kit);
  const validReqIds = new Set(next.role.requirements.map((r) => r.id));
  const flashcard: Flashcard = {
    id: nextId("f", next.flashcards.map((f) => f.id)),
    front: input.front,
    back: input.back,
    requirement_ids: (input.requirement_ids ?? []).filter((id) => validReqIds.has(id)),
    state: "edited",
    practice: { confidence: null, reviewCount: 0, lastReviewedAt: null },
  };
  next.flashcards.push(flashcard);
  return next;
}

export function updateFlashcard(kit: Kit, id: string, patch: Partial<Pick<Flashcard, "front" | "back" | "requirement_ids">>): Kit {
  const next = clone(kit);
  const f = next.flashcards.find((x) => x.id === id);
  if (!f) throw new AppError("NOT_FOUND", `Flashcard ${id} not found`);
  if (patch.requirement_ids) {
    const validReqIds = new Set(next.role.requirements.map((r) => r.id));
    f.requirement_ids = patch.requirement_ids.filter((rid) => validReqIds.has(rid));
  }
  if (patch.front !== undefined) f.front = patch.front;
  if (patch.back !== undefined) f.back = patch.back;
  if (f.state !== "pinned") f.state = "edited";
  return next;
}

export function deleteFlashcard(kit: Kit, id: string): Kit {
  const next = clone(kit);
  const exists = next.flashcards.some((f) => f.id === id);
  if (!exists) throw new AppError("NOT_FOUND", `Flashcard ${id} not found`);
  next.flashcards = next.flashcards.filter((f) => f.id !== id);
  return next;
}

export function pinFlashcard(kit: Kit, id: string, pinned: boolean): Kit {
  const next = clone(kit);
  const f = next.flashcards.find((x) => x.id === id);
  if (!f) throw new AppError("NOT_FOUND", `Flashcard ${id} not found`);
  f.state = pinned ? "pinned" : "edited";
  return next;
}

export function recordFlashcardPractice(kit: Kit, id: string, confidence: "low" | "medium" | "high"): Kit {
  const next = clone(kit);
  const f = next.flashcards.find((x) => x.id === id);
  if (!f) throw new AppError("NOT_FOUND", `Flashcard ${id} not found`);
  f.practice = {
    confidence,
    reviewCount: (f.practice?.reviewCount ?? 0) + 1,
    lastReviewedAt: new Date().toISOString(),
  };
  return next;
}

// --- company brief ---------------------------------------------------------

export function updateCompanyBrief(kit: Kit, patch: Partial<Pick<Kit["company_brief"], "summary" | "what_they_do">>): Kit {
  const next = clone(kit);
  if (patch.summary !== undefined) next.company_brief.summary = patch.summary;
  if (patch.what_they_do !== undefined) next.company_brief.what_they_do = patch.what_they_do;
  if (next.company_brief.state !== "pinned") next.company_brief.state = "edited";
  return next;
}

export function pinCompanyBrief(kit: Kit, pinned: boolean): Kit {
  const next = clone(kit);
  next.company_brief.state = pinned ? "pinned" : "edited";
  return next;
}

// --- regeneration (preserves edited/pinned content) ------------------------

/**
 * Replaces only "generated"-state questions in the target category with the
 * freshly generated ones. Edited/pinned questions (in any category) are
 * always kept untouched, unless `force` is set. New ids continue numbering
 * from the current max so no collisions occur. Schedule day structure is
 * preserved; only references to removed question ids are pruned so the kit
 * stays schema-valid (see pruneDanglingScheduleReferences).
 */
export function regenerateQuestionCategory(
  kit: Kit,
  category: QuestionCategoryValue,
  freshlyGenerated: Omit<Question, "id" | "state">[],
  opts: { force?: boolean } = {},
): Kit {
  const next = clone(kit);
  const kept = next.questions.filter((q) => {
    if (q.category !== category) return true;
    if (opts.force) return false;
    return q.state !== "generated";
  });
  const existingIds = kept.map((q) => q.id);
  let cursor = existingIds;
  const added: Question[] = freshlyGenerated.map((q) => {
    const id = nextId("q", cursor);
    cursor = [...cursor, id];
    return { ...q, id, state: "generated" as const };
  });
  next.questions = [...kept, ...added];
  pruneDanglingScheduleReferences(next);
  return recomputeCoverage(next);
}

export function regenerateFlashcards(kit: Kit, freshlyGenerated: Omit<Flashcard, "id" | "state">[], opts: { force?: boolean } = {}): Kit {
  const next = clone(kit);
  const kept = next.flashcards.filter((f) => (opts.force ? false : f.state !== "generated"));
  const existingIds = kept.map((f) => f.id);
  let cursor = existingIds;
  const added: Flashcard[] = freshlyGenerated.map((f) => {
    const id = nextId("f", cursor);
    cursor = [...cursor, id];
    return { ...f, id, state: "generated" as const };
  });
  next.flashcards = [...kept, ...added];
  return next;
}

export function regenerateCompanyBrief(kit: Kit, fresh: { summary: string; what_they_do: string; sources: string[] }, opts: { force?: boolean } = {}): Kit {
  const next = clone(kit);
  if (next.company_brief.state !== "generated" && !opts.force) {
    throw new AppError(
      "CONFLICT",
      "Company brief has been manually edited/pinned and will not be overwritten. Pass force=true to override.",
    );
  }
  next.company_brief = { ...fresh, state: "generated" };
  return next;
}

export function replaceSchedule(kit: Kit, schedule: Kit["schedule"]): Kit {
  const next = clone(kit);
  next.schedule = schedule;
  return next;
}
