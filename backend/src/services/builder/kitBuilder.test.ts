import { describe, it, expect } from "vitest";
import {
  updateQuestion,
  pinQuestion,
  deleteQuestion,
  regenerateQuestionCategory,
  regenerateCompanyBrief,
  regenerateFlashcards,
} from "./kitBuilder.js";
import { validateKit, type Kit } from "../../validation/kitSchema.js";
import { AppError } from "../../utils/AppError.js";

function baseKit(): Kit {
  return validateKit({
    source: {
      company: "Acme",
      company_url: "https://acme.test",
      role: "Backend Engineer",
      location: "",
      jd_chars: 100,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.test"],
    },
    company_brief: { summary: "Acme brief", what_they_do: "Robots", sources: ["https://acme.test"], state: "generated" },
    role: {
      title: "Backend Engineer",
      seniority: "mid",
      responsibilities: [],
      requirements: [
        { id: "r1", text: "Node.js", kind: "technical", priority: "must" },
        { id: "r2", text: "Mentoring", kind: "behavioural", priority: "nice" },
      ],
    },
    questions: [
      { id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "Q1", answer_outline: "A1", difficulty: 1, state: "generated" },
      { id: "q2", requirement_ids: ["r1"], category: "technical", prompt: "Q2", answer_outline: "A2", difficulty: 2, state: "generated" },
      { id: "q3", requirement_ids: ["r2"], category: "behavioural", prompt: "Q3", answer_outline: "A3", difficulty: 1, state: "generated" },
    ],
    flashcards: [
      { id: "f1", front: "F1", back: "B1", requirement_ids: ["r1"], state: "generated", practice: { confidence: null, reviewCount: 0, lastReviewedAt: null } },
    ],
    schedule: { days_available: 2, days: [{ day: 1, focus: "Technical", question_ids: ["q1", "q2"], minutes: 40 }, { day: 2, focus: "Behavioural", question_ids: ["q3"], minutes: 20 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  });
}

describe("kitBuilder regeneration preserves user edits", () => {
  it("marks a question as edited when the user updates it, and keeps it during regeneration", () => {
    let kit = baseKit();
    kit = updateQuestion(kit, "q1", { prompt: "User-edited prompt" });
    expect(kit.questions.find((q) => q.id === "q1")?.state).toBe("edited");

    const regenerated = regenerateQuestionCategory(kit, "technical", [
      { requirement_ids: ["r1"], category: "technical", prompt: "Fresh Q", answer_outline: "Fresh A", difficulty: 3 },
    ]);

    const preserved = regenerated.questions.find((q) => q.id === "q1");
    expect(preserved?.prompt).toBe("User-edited prompt");
    expect(preserved?.state).toBe("edited");

    // the other "generated" technical question (q2) should have been replaced
    expect(regenerated.questions.find((q) => q.id === "q2")).toBeUndefined();
    // a new generated question should have been added
    const newQuestions = regenerated.questions.filter((q) => q.category === "technical" && q.state === "generated");
    expect(newQuestions).toHaveLength(1);
    expect(newQuestions[0].prompt).toBe("Fresh Q");

    // unrelated category (behavioural q3) is untouched
    expect(regenerated.questions.find((q) => q.id === "q3")).toBeDefined();
  });

  it("keeps pinned questions during regeneration even without prior edits, unless force is used", () => {
    let kit = baseKit();
    kit = pinQuestion(kit, "q2", true);
    expect(kit.questions.find((q) => q.id === "q2")?.state).toBe("pinned");

    const regenerated = regenerateQuestionCategory(kit, "technical", [
      { requirement_ids: ["r1"], category: "technical", prompt: "Fresh Q", answer_outline: "Fresh A", difficulty: 3 },
    ]);
    expect(regenerated.questions.find((q) => q.id === "q2")?.state).toBe("pinned");

    const forced = regenerateQuestionCategory(
      kit,
      "technical",
      [{ requirement_ids: ["r1"], category: "technical", prompt: "Forced Q", answer_outline: "A", difficulty: 1 }],
      { force: true },
    );
    expect(forced.questions.find((q) => q.id === "q2")).toBeUndefined();
  });

  it("prunes dangling schedule references when a generated question is removed by regeneration", () => {
    const kit = baseKit();
    const regenerated = regenerateQuestionCategory(kit, "technical", []);
    // q1 and q2 (both "generated" technical) should be gone, and day 1's
    // question_ids should no longer reference them.
    const day1 = regenerated.schedule.days.find((d) => d.day === 1)!;
    expect(day1.question_ids).toEqual([]);
    // day 2 (behavioural, untouched) should be unaffected
    const day2 = regenerated.schedule.days.find((d) => d.day === 2)!;
    expect(day2.question_ids).toEqual(["q3"]);
  });

  it("recomputes coverage after questions change", () => {
    const kit = baseKit();
    const afterDelete = deleteQuestion(kit, "q3"); // was the only question covering r2
    expect(afterDelete.coverage.uncovered_requirement_ids).toContain("r2");
  });

  it("refuses to overwrite an edited company brief on regenerate unless forced", () => {
    let kit = baseKit();
    kit.company_brief.state = "edited";
    kit.company_brief.summary = "User wrote this themselves";

    expect(() =>
      regenerateCompanyBrief(kit, { summary: "fresh", what_they_do: "fresh", sources: [] }),
    ).toThrow(AppError);

    const forced = regenerateCompanyBrief(kit, { summary: "fresh", what_they_do: "fresh", sources: [] }, { force: true });
    expect(forced.company_brief.summary).toBe("fresh");
    expect(forced.company_brief.state).toBe("generated");
  });

  it("preserves edited flashcards during flashcard regeneration", () => {
    let kit = baseKit();
    kit.flashcards[0].state = "edited";
    kit.flashcards[0].front = "User-edited front";

    const regenerated = regenerateFlashcards(kit, [{ front: "Fresh front", back: "Fresh back", requirement_ids: ["r1"], practice: { confidence: null, reviewCount: 0, lastReviewedAt: null } }]);

    expect(regenerated.flashcards.find((f) => f.id === "f1")?.front).toBe("User-edited front");
    expect(regenerated.flashcards.some((f) => f.front === "Fresh front")).toBe(true);
  });

  it("every mutation still produces a schema-valid kit", () => {
    let kit = baseKit();
    kit = updateQuestion(kit, "q1", { prompt: "Edited" });
    kit = regenerateQuestionCategory(kit, "behavioural", [
      { requirement_ids: ["r2"], category: "behavioural", prompt: "New behavioural", answer_outline: "A", difficulty: 2 },
    ]);
    expect(() => validateKit(kit)).not.toThrow();
  });
});
