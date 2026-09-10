import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import mongoose from "mongoose";

// Stub the pipeline so this test never calls the real LLM/network - it only
// verifies the duplicate-submission (idempotency) contract, not generation
// correctness (that's covered elsewhere: batchEvaluate.test.ts, the sample
// evaluator run, etc). The stub resolves slowly enough that a rapid second
// submission is guaranteed to observe the first run still in flight.
vi.mock("../services/evaluation/pipeline.js", () => ({
  runGenerationPipeline: vi.fn(async (input: { jd: string; company_url: string; days: number }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      kit: {
        source: {
          company: "Stub Co",
          company_url: input.company_url,
          role: "Engineer",
          location: "",
          jd_chars: input.jd.length,
          researched_at: new Date().toISOString(),
          pages_used: [],
        },
        company_brief: { summary: "s", what_they_do: "d", sources: [], state: "generated" },
        role: { title: "Engineer", seniority: "mid", responsibilities: [], requirements: [] },
        questions: [],
        flashcards: [],
        schedule: {
          days_available: input.days,
          days: Array.from({ length: input.days }, (_, i) => ({
            day: i + 1,
            focus: "General preparation (no generated questions available)",
            question_ids: [],
            minutes: 20,
          })),
        },
        coverage: { uncovered_requirement_ids: [], passes: 1 },
      },
      warnings: [],
      retrievalFailures: [],
      interviewDiscussion: { found: false, results: [] },
    };
  }),
}));

const { createApp } = await import("../app.js");
const { GenerationRun } = await import("../models/GenerationRun.js");
const { User } = await import("../models/User.js");

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await GenerationRun.init(); // build the partial unique index before the concurrency test relies on it
}, 60_000);

afterAll(async () => {
  // let any straggling fire-and-forget executeRun() background work from the
  // stub pipeline settle before tearing down the connection, so it doesn't
  // log a (harmless, test-only) "client was closed" error on its way out.
  await new Promise((resolve) => setTimeout(resolve, 500));
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GenerationRun.deleteMany({});
});

describe("duplicate submission / idempotency", () => {
  it("returns the same in-flight run instead of starting a second pipeline for an identical rapid resubmission", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ email: "dedup@example.com", password: "hunter22" });

    const body = { jd: "Same JD text", company_url: "http://localhost:8099/", days: 5 };

    const [first, second] = await Promise.all([agent.post("/api/kits").send(body), agent.post("/api/kits").send(body)]);

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(first.body.runId).toBe(second.body.runId);
    // one of the two should report the dedup explicitly
    expect([first.body.deduplicated, second.body.deduplicated]).toContain(true);

    const runs = await GenerationRun.find({});
    expect(runs).toHaveLength(1);
  });

  it("does not deduplicate a genuinely different request (different days)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ email: "dedup2@example.com", password: "hunter22" });

    const first = await agent.post("/api/kits").send({ jd: "Same JD text", company_url: "http://localhost:8099/", days: 5 });
    const second = await agent.post("/api/kits").send({ jd: "Same JD text", company_url: "http://localhost:8099/", days: 10 });

    expect(first.body.runId).not.toBe(second.body.runId);
    expect(second.body.deduplicated).toBe(false);

    const runs = await GenerationRun.find({});
    expect(runs).toHaveLength(2);
  });

  it("does not deduplicate against a run that already completed - a user can regenerate deliberately", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ email: "dedup3@example.com", password: "hunter22" });

    const body = { jd: "Same JD text", company_url: "http://localhost:8099/", days: 3 };
    const first = await agent.post("/api/kits").send(body);
    expect(first.status).toBe(202);

    // wait for the stubbed pipeline to finish so the run transitions to "completed"
    await new Promise((resolve) => setTimeout(resolve, 600));
    const runAfterFirst = await GenerationRun.findById(first.body.runId);
    expect(runAfterFirst?.status).toBe("completed");

    const second = await agent.post("/api/kits").send(body);
    expect(second.body.deduplicated).toBe(false);
    expect(second.body.runId).not.toBe(first.body.runId);

    const runs = await GenerationRun.find({});
    expect(runs).toHaveLength(2);
  });

  it("does not deduplicate across different users submitting the identical request", async () => {
    const agentA = request.agent(app);
    await agentA.post("/api/auth/register").send({ email: "userA-dedup@example.com", password: "hunter22" });
    const agentB = request.agent(app);
    await agentB.post("/api/auth/register").send({ email: "userB-dedup@example.com", password: "hunter22" });

    const body = { jd: "Same JD text", company_url: "http://localhost:8099/", days: 5 };
    const [fromA, fromB] = await Promise.all([agentA.post("/api/kits").send(body), agentB.post("/api/kits").send(body)]);

    expect(fromA.body.runId).not.toBe(fromB.body.runId);
    expect(fromA.body.deduplicated).toBe(false);
    expect(fromB.body.deduplicated).toBe(false);
  });
});
