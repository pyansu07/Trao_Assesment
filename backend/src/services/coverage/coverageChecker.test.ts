import { describe, it, expect } from "vitest";
import { computeUncoveredMustRequirements, computeUncoveredRequirementIds } from "./coverageChecker.js";
import type { Question, Requirement } from "../../validation/kitSchema.js";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

function question(id: string, requirement_ids: string[]): Question {
  return {
    id,
    requirement_ids,
    category: "technical",
    prompt: "p",
    answer_outline: "a",
    difficulty: 1,
    state: "generated",
  };
}

describe("computeUncoveredRequirementIds", () => {
  it("returns no uncovered ids when every requirement has a question", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [question("q1", ["r1"]), question("q2", ["r2"])];
    expect(computeUncoveredRequirementIds(requirements, questions)).toEqual([]);
  });

  it("detects a single uncovered requirement", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [question("q1", ["r1"]), question("q2", ["r3"])];
    expect(computeUncoveredRequirementIds(requirements, questions)).toEqual(["r2"]);
  });

  it("detects multiple uncovered requirements", () => {
    const requirements = [req("r1"), req("r2"), req("r3"), req("r4")];
    const questions = [question("q1", ["r1"])];
    expect(computeUncoveredRequirementIds(requirements, questions)).toEqual(["r2", "r3", "r4"]);
  });

  it("treats a nice-to-have requirement the same as any other for coverage purposes", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions = [question("q1", ["r1"])];
    expect(computeUncoveredRequirementIds(requirements, questions)).toEqual(["r2"]);
  });

  it("is deterministic across repeated calls with the same input", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [question("q1", ["r1"])];
    const first = computeUncoveredRequirementIds(requirements, questions);
    const second = computeUncoveredRequirementIds(requirements, questions);
    expect(first).toEqual(second);
  });

  it("counts a requirement as covered when referenced by any question, not just the first", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [question("q1", ["r2"]), question("q2", ["r1", "r2"])];
    expect(computeUncoveredRequirementIds(requirements, questions)).toEqual([]);
  });
});

describe("computeUncoveredMustRequirements", () => {
  it("only returns MUST requirements, ignoring uncovered NICE ones", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions: Question[] = [];
    const uncoveredMust = computeUncoveredMustRequirements(requirements, questions);
    expect(uncoveredMust.map((r) => r.id)).toEqual(["r1"]);
  });
});
