import { describe, it, expect, vi } from "vitest";
import { evaluateCases, buildOutputDocument } from "./batchEvaluate.js";
import { AppError } from "../../utils/AppError.js";
import type { Kit } from "../../validation/kitSchema.js";

function fakeKit(company: string): Kit {
  return {
    source: {
      company,
      company_url: "http://localhost:8099/",
      role: "Engineer",
      location: "",
      jd_chars: 10,
      researched_at: new Date().toISOString(),
      pages_used: [],
    },
    company_brief: { summary: "s", what_they_do: "d", sources: [], state: "generated" },
    role: { title: "Engineer", seniority: "mid", responsibilities: [], requirements: [] },
    questions: [],
    flashcards: [],
    schedule: { days_available: 1, days: [{ day: 1, focus: "General preparation (no generated questions available)", question_ids: [], minutes: 20 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

describe("evaluateCases", () => {
  it("continues processing after one case fails, and preserves case ids", async () => {
    const cases = [
      { id: "case-01", jd: "JD one", company_url: "http://localhost:8099/", days: 3 },
      { id: "case-02", jd: "JD two", company_url: "http://localhost:8099/", days: 3 },
      { id: "case-03", jd: "JD three", company_url: "http://localhost:8099/", days: 3 },
    ];

    const runPipeline = vi.fn().mockImplementation(async (input: { jd: string }) => {
      if (input.jd === "JD two") {
        throw new AppError("LLM_UNAVAILABLE", "simulated LLM outage");
      }
      return { kit: fakeKit(input.jd), warnings: [], retrievalFailures: [] };
    });

    const results = await evaluateCases(cases, runPipeline);

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(["case-01", "case-02", "case-03"]);
    expect(results[0].status).toBe("ok");
    expect(results[1].status).toBe("failed");
    expect(results[1].error?.code).toBe("LLM_UNAVAILABLE");
    expect(results[2].status).toBe("ok"); // processing continued after the failure
    expect(runPipeline).toHaveBeenCalledTimes(3);
  });

  it("marks a structurally invalid case as failed with INVALID_INPUT without calling the pipeline", async () => {
    const cases = [{ id: "case-bad", jd: "", company_url: "not-a-url", days: 999 }];
    const runPipeline = vi.fn();

    const results = await evaluateCases(cases, runPipeline);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].error?.code).toBe("INVALID_INPUT");
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it("falls back to a generated id (rather than dropping the case) when a case is missing its id", async () => {
    // BatchCaseSchema requires an id (so Appendix B output can preserve case
    // identity) - a case without one is invalid input, but it still gets a
    // synthetic id and a proper result entry instead of silently vanishing.
    const cases = [{ jd: "no id here", company_url: "http://localhost:8099/", days: 2 }];
    const runPipeline = vi.fn();
    const results = await evaluateCases(cases, runPipeline);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBeTruthy();
    expect(results[0].status).toBe("failed");
    expect(results[0].error?.code).toBe("INVALID_INPUT");
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it("produces output matching the required shape (version, generated_at, kits[])", async () => {
    const cases = [{ id: "c1", jd: "jd", company_url: "http://localhost:8099/", days: 1 }];
    const runPipeline = vi.fn().mockResolvedValue({ kit: fakeKit("x"), warnings: [], retrievalFailures: [] });
    const results = await evaluateCases(cases, runPipeline);
    const output = buildOutputDocument(results);

    expect(output.version).toBe("1.0");
    expect(typeof output.generated_at).toBe("string");
    expect(Array.isArray(output.kits)).toBe(true);
    expect(output.kits[0]).toEqual({ id: "c1", status: "ok", kit: expect.any(Object), error: null });
  });

  it("produces one output entry per input case even when several fail", async () => {
    const cases = [
      { id: "c1", jd: "jd", company_url: "http://localhost:8099/", days: 1 },
      { id: "c2", jd: "jd", company_url: "http://localhost:8099/", days: 1 },
      { id: "c3", jd: "jd", company_url: "http://localhost:8099/", days: 1 },
    ];
    const runPipeline = vi.fn().mockRejectedValue(new AppError("COMPANY_UNREACHABLE", "down"));
    const results = await evaluateCases(cases, runPipeline);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "failed")).toBe(true);
    expect(results.every((r) => r.kit === null)).toBe(true);
  });
});
