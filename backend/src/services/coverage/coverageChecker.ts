import type { Question, Requirement } from "../../validation/kitSchema.js";

// ---------------------------------------------------------------------------
// Deterministic coverage checking. This is pure code - the LLM never decides
// whether a requirement is covered. A requirement is "covered" iff at least
// one question references its id in requirement_ids.
// ---------------------------------------------------------------------------

export function computeUncoveredRequirementIds(
  requirements: Requirement[],
  questions: Question[],
): string[] {
  const covered = new Set<string>();
  for (const q of questions) {
    for (const rid of q.requirement_ids) covered.add(rid);
  }
  return requirements.filter((r) => !covered.has(r.id)).map((r) => r.id);
}

export function computeUncoveredMustRequirements(
  requirements: Requirement[],
  questions: Question[],
): Requirement[] {
  const uncoveredIds = new Set(computeUncoveredRequirementIds(requirements, questions));
  return requirements.filter((r) => r.priority === "must" && uncoveredIds.has(r.id));
}
