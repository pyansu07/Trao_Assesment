import { describe, it, expect } from "vitest";
import { validateKit, KitValidationError } from "./kitSchema.js";

function validKit() {
  return {
    source: {
      company: "Acme",
      company_url: "https://acme.test",
      role: "Backend Engineer",
      location: "Remote",
      jd_chars: 120,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.test"],
    },
    company_brief: {
      summary: "Acme builds things.",
      what_they_do: "Robots.",
      sources: ["https://acme.test"],
      state: "generated",
    },
    role: {
      title: "Backend Engineer",
      seniority: "mid",
      responsibilities: ["Build services"],
      requirements: [
        { id: "r1", text: "5 years Node.js", kind: "technical", priority: "must" },
        { id: "r2", text: "Mentor engineers", kind: "behavioural", priority: "nice" },
      ],
    },
    questions: [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "Explain event loop",
        answer_outline: "Discuss phases",
        difficulty: 2,
        state: "generated",
      },
    ],
    flashcards: [
      {
        id: "f1",
        front: "What is Node.js?",
        back: "A JS runtime",
        requirement_ids: ["r1"],
        state: "generated",
        practice: { confidence: null, reviewCount: 0, lastReviewedAt: null },
      },
    ],
    schedule: {
      days_available: 1,
      days: [{ day: 1, focus: "Technical fundamentals", question_ids: ["q1"], minutes: 40 }],
    },
    coverage: { uncovered_requirement_ids: ["r2"], passes: 1 },
  };
}

describe("validateKit", () => {
  it("accepts a well-formed kit", () => {
    expect(() => validateKit(validKit())).not.toThrow();
  });

  it("rejects a kit missing a required field", () => {
    const kit = validKit() as any;
    delete kit.role.title;
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects an invalid difficulty value", () => {
    const kit = validKit() as any;
    kit.questions[0].difficulty = 4;
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects an invalid question category", () => {
    const kit = validKit() as any;
    kit.questions[0].category = "trivia";
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects an invalid requirement priority", () => {
    const kit = validKit() as any;
    kit.role.requirements[0].priority = "optional";
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects an invalid requirement kind", () => {
    const kit = validKit() as any;
    kit.role.requirements[0].kind = "soft-skill";
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects a schedule referencing a question id that does not exist", () => {
    const kit = validKit() as any;
    kit.schedule.days[0].question_ids = ["q999"];
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects non-integer minutes", () => {
    const kit = validKit() as any;
    kit.schedule.days[0].minutes = 40.5;
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects when schedule.days length does not match days_available", () => {
    const kit = validKit() as any;
    kit.schedule.days_available = 3;
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects a question referencing an unknown requirement id", () => {
    const kit = validKit() as any;
    kit.questions[0].requirement_ids = ["r999"];
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });

  it("rejects duplicate question ids", () => {
    const kit = validKit() as any;
    kit.questions.push({ ...kit.questions[0] });
    expect(() => validateKit(kit)).toThrow(KitValidationError);
  });
});
