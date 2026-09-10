import type { Question, Requirement, Schedule, ScheduleDay } from "../../validation/kitSchema.js";

// ---------------------------------------------------------------------------
// Deterministic schedule allocation. No LLM involvement - pure, testable code.
// Rules (per assessment):
//   - exactly `daysAvailable` days are produced
//   - every day has day/focus/question_ids/minutes (minutes always integer)
//   - all MUST requirements appear somewhere in the schedule
//   - difficult / must-linked material is scheduled earlier
//   - handles 1..60 day ranges, including days that exceed question supply
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical fundamentals",
  behavioural: "Behavioural readiness",
  "system-design": "System design",
  "company-fit": "Company fit & culture",
};

interface BuildScheduleInput {
  requirements: Requirement[];
  questions: Question[];
  daysAvailable: number;
}

function parseNumericSuffix(id: string): number {
  const m = id.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function minutesFor(count: number, isReview: boolean): number {
  if (count === 0) return isReview ? 20 : 15;
  const base = isReview ? 15 : 20;
  const perQuestion = isReview ? 15 : 20;
  return Math.min(180, base + perQuestion * count);
}

function focusForQuestions(qs: Question[]): string {
  if (qs.length === 0) return "Light review day";
  const counts = new Map<string, number>();
  for (const q of qs) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 2).map(([cat]) => CATEGORY_LABELS[cat] ?? cat);
  return top.join(" & ");
}

/**
 * Builds a deterministic day-by-day schedule from generated questions.
 * All questions are scheduled exactly once across the "fresh content" days
 * (front-loaded by must-linked + difficulty), guaranteeing every requirement
 * that has at least one covering question appears somewhere in the plan.
 * Any remaining days (daysAvailable > number of questions) become spaced
 * review days that rotate through must-linked / high-value questions instead
 * of being left empty.
 */
export function buildSchedule({ requirements, questions, daysAvailable }: BuildScheduleInput): Schedule {
  const mustIds = new Set(requirements.filter((r) => r.priority === "must").map((r) => r.id));
  const isMustLinked = (q: Question) => q.requirement_ids.some((rid) => mustIds.has(rid));

  const ordered = [...questions].sort((a, b) => {
    const aMust = isMustLinked(a) ? 0 : 1;
    const bMust = isMustLinked(b) ? 0 : 1;
    if (aMust !== bMust) return aMust - bMust;
    if (a.difficulty !== b.difficulty) return b.difficulty - a.difficulty;
    return parseNumericSuffix(a.id) - parseNumericSuffix(b.id);
  });

  const days: ScheduleDay[] = [];
  const total = ordered.length;

  if (total === 0) {
    for (let d = 1; d <= daysAvailable; d++) {
      days.push({
        day: d,
        focus: "General preparation (no generated questions available)",
        question_ids: [],
        minutes: 20,
      });
    }
    return { days_available: daysAvailable, days };
  }

  const freshDays = Math.min(daysAvailable, total);
  const baseChunk = Math.floor(total / freshDays);
  const remainder = total % freshDays;

  const freshChunks: Question[][] = [];
  let cursor = 0;
  for (let i = 0; i < freshDays; i++) {
    const size = baseChunk + (i < remainder ? 1 : 0);
    freshChunks.push(ordered.slice(cursor, cursor + size));
    cursor += size;
  }

  const reviewPool = ordered.filter(isMustLinked).length > 0 ? ordered.filter(isMustLinked) : ordered;

  for (let d = 1; d <= daysAvailable; d++) {
    if (d <= freshDays) {
      const dayQuestions = freshChunks[d - 1];
      days.push({
        day: d,
        focus: focusForQuestions(dayQuestions),
        question_ids: dayQuestions.map((q) => q.id),
        minutes: minutesFor(dayQuestions.length, false),
      });
    } else {
      const size = Math.min(3, reviewPool.length);
      const offset = ((d - freshDays - 1) * size) % reviewPool.length;
      const reviewQuestions: Question[] = [];
      for (let i = 0; i < size; i++) {
        reviewQuestions.push(reviewPool[(offset + i) % reviewPool.length]);
      }
      days.push({
        day: d,
        focus: "Review & practice: reinforce weaker areas",
        question_ids: reviewQuestions.map((q) => q.id),
        minutes: minutesFor(reviewQuestions.length, true),
      });
    }
  }

  return { days_available: daysAvailable, days };
}
