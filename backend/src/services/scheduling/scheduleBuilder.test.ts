import { describe, it, expect } from "vitest";
import { buildSchedule } from "./scheduleBuilder.js";
import type { Question, Requirement } from "../../validation/kitSchema.js";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

function question(id: string, requirement_ids: string[], difficulty: 1 | 2 | 3 = 2): Question {
  return {
    id,
    requirement_ids,
    category: "technical",
    prompt: `prompt ${id}`,
    answer_outline: "outline",
    difficulty,
    state: "generated",
  };
}

describe("buildSchedule", () => {
  it("produces exactly the requested number of days", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [question("q1", ["r1"]), question("q2", ["r2"]), question("q3", ["r3"])];

    for (const days of [1, 5, 60]) {
      const schedule = buildSchedule({ requirements, questions, daysAvailable: days });
      expect(schedule.days).toHaveLength(days);
      expect(schedule.days_available).toBe(days);
    }
  });

  it("handles a single day by putting everything into day 1", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [question("q1", ["r1"]), question("q2", ["r2"])];
    const schedule = buildSchedule({ requirements, questions, daysAvailable: 1 });
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids.sort()).toEqual(["q1", "q2"]);
  });

  it("always uses integer minutes", () => {
    const requirements = [req("r1"), req("r2"), req("r3"), req("r4")];
    const questions = requirements.map((r, i) => question(`q${i + 1}`, [r.id]));
    for (const days of [1, 3, 7, 60]) {
      const schedule = buildSchedule({ requirements, questions, daysAvailable: days });
      for (const day of schedule.days) {
        expect(Number.isInteger(day.minutes)).toBe(true);
        expect(day.minutes).toBeGreaterThan(0);
      }
    }
  });

  it("ensures every MUST requirement is covered by some scheduled question", () => {
    const requirements = [req("r1", "must"), req("r2", "must"), req("r3", "nice")];
    const questions = [question("q1", ["r1"]), question("q2", ["r2"]), question("q3", ["r3"])];
    const schedule = buildSchedule({ requirements, questions, daysAvailable: 5 });

    const scheduledQuestionIds = new Set(schedule.days.flatMap((d) => d.question_ids));
    const mustRequirementIds = requirements.filter((r) => r.priority === "must").map((r) => r.id);
    for (const rid of mustRequirementIds) {
      const coveringQuestionIds = questions.filter((q) => q.requirement_ids.includes(rid)).map((q) => q.id);
      expect(coveringQuestionIds.some((qid) => scheduledQuestionIds.has(qid))).toBe(true);
    }
  });

  it("schedules difficult / must-linked questions on earlier days than easy/nice-only questions", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions = [
      question("q1", ["r1"], 3), // must + hard -> should land early
      question("q2", ["r2"], 1), // nice + easy -> should land later
    ];
    const schedule = buildSchedule({ requirements, questions, daysAvailable: 2 });
    const dayOfQ1 = schedule.days.find((d) => d.question_ids.includes("q1"))!.day;
    const dayOfQ2 = schedule.days.find((d) => d.question_ids.includes("q2"))!.day;
    expect(dayOfQ1).toBeLessThanOrEqual(dayOfQ2);
  });

  it("does not leave any day empty when questions exist, even for large day counts", () => {
    const requirements = [req("r1", "must"), req("r2", "must")];
    const questions = [question("q1", ["r1"]), question("q2", ["r2"])];
    const schedule = buildSchedule({ requirements, questions, daysAvailable: 60 });
    expect(schedule.days).toHaveLength(60);
    for (const day of schedule.days) {
      expect(day.question_ids.length).toBeGreaterThan(0);
    }
  });

  it("handles zero generated questions without crashing and produces the requested day count", () => {
    const schedule = buildSchedule({ requirements: [], questions: [], daysAvailable: 5 });
    expect(schedule.days).toHaveLength(5);
    for (const day of schedule.days) {
      expect(day.question_ids).toEqual([]);
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it("only references question ids that actually exist", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [question("q1", ["r1"]), question("q2", ["r2"])];
    const schedule = buildSchedule({ requirements, questions, daysAvailable: 10 });
    const validIds = new Set(questions.map((q) => q.id));
    for (const day of schedule.days) {
      for (const qid of day.question_ids) {
        expect(validIds.has(qid)).toBe(true);
      }
    }
  });
});
