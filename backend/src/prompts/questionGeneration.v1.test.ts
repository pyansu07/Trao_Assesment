import { describe, it, expect } from "vitest";
import { buildQuestionGenerationUserContent } from "./questionGeneration.v1.js";

describe("buildQuestionGenerationUserContent", () => {
  it("includes public interview-discussion snippets when provided, wrapped as untrusted content", () => {
    const content = buildQuestionGenerationUserContent({
      roleTitle: "Engineer",
      seniority: "mid",
      requirements: [],
      interviewDiscussion: [
        { title: "My Acme interview experience", url: "https://reddit.com/r/x/1", snippet: "Three rounds: recruiter call, technical screen, onsite." },
      ],
      maxQuestions: 3,
    });

    expect(content).toContain("PUBLIC DISCUSSION OF THIS COMPANY'S INTERVIEW PROCESS");
    expect(content).toContain("My Acme interview experience");
    expect(content).toContain("Three rounds: recruiter call, technical screen, onsite.");
    expect(content).toContain("BEGIN UNTRUSTED");
  });

  it("omits the discussion section entirely when none is provided", () => {
    const content = buildQuestionGenerationUserContent({
      roleTitle: "Engineer",
      seniority: "mid",
      requirements: [],
      maxQuestions: 3,
    });
    expect(content).not.toContain("PUBLIC DISCUSSION OF THIS COMPANY'S INTERVIEW PROCESS");
  });
});
