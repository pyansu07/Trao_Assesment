import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { KitModel } from "../models/Kit.js";
import { User } from "../models/User.js";
import { GenerationRun } from "../models/GenerationRun.js";

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await KitModel.deleteMany({});
  await GenerationRun.deleteMany({});
});

function minimalKit(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    source: { company: "Acme", company_url: "https://acme.test", role: "Engineer", location: "", jd_chars: 5, researched_at: new Date().toISOString(), pages_used: [] },
    company_brief: { summary: "s", what_they_do: "d", sources: [], state: "generated" },
    role: { title: "Engineer", seniority: "mid", responsibilities: [], requirements: [] },
    questions: [],
    flashcards: [],
    schedule: { days_available: 1, days: [{ day: 1, focus: "General preparation (no generated questions available)", question_ids: [], minutes: 20 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
    ...overrides,
  };
}

describe("authentication", () => {
  it("registers a new user and sets a session cookie", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "alice@example.com", password: "hunter22" });
    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.body.user.email).toBe("alice@example.com");
  });

  it("rejects registering the same email twice", async () => {
    await request(app).post("/api/auth/register").send({ email: "dup@example.com", password: "hunter22" });
    const res = await request(app).post("/api/auth/register").send({ email: "dup@example.com", password: "hunter22" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("never stores the password in plaintext", async () => {
    await request(app).post("/api/auth/register").send({ email: "plain@example.com", password: "hunter22" });
    const user = await User.findOne({ email: "plain@example.com" });
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe("hunter22");
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    await request(app).post("/api/auth/register").send({ email: "bob@example.com", password: "correcthorse" });
    const good = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "correcthorse" });
    expect(good.status).toBe(200);

    const bad = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "wrongpassword" });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects protected routes without a session", async () => {
    const res = await request(app).get("/api/kits");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects protected routes with a garbage session cookie", async () => {
    const res = await request(app).get("/api/kits").set("Cookie", "session_token=not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("allows access to protected routes with a valid session", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ email: "carol@example.com", password: "hunter22" });
    const res = await agent.get("/api/kits");
    expect(res.status).toBe(200);
    expect(res.body.kits).toEqual([]);
  });

  it("clears the session on logout so subsequent requests are unauthenticated", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ email: "dave@example.com", password: "hunter22" });
    await agent.post("/api/auth/logout");
    const res = await agent.get("/api/kits");
    expect(res.status).toBe(401);
  });
});

describe("kit ownership isolation", () => {
  it("lets an owner read their own kit", async () => {
    const agent = request.agent(app);
    const registerRes = await agent.post("/api/auth/register").send({ email: "owner@example.com", password: "hunter22" });
    const ownerId = registerRes.body.user.id;

    const kit = await KitModel.create({ ownerId, requestHash: "hash1", ...minimalKit() });
    const res = await agent.get(`/api/kits/${kit._id}`);
    expect(res.status).toBe(200);
    expect(res.body.kit.source.company).toBe("Acme");
  });

  it("forbids a different authenticated user from reading someone else's kit", async () => {
    const ownerAgent = request.agent(app);
    const ownerRes = await ownerAgent.post("/api/auth/register").send({ email: "owner2@example.com", password: "hunter22" });
    const ownerId = ownerRes.body.user.id;
    const kit = await KitModel.create({ ownerId, requestHash: "hash2", ...minimalKit() });

    const strangerAgent = request.agent(app);
    await strangerAgent.post("/api/auth/register").send({ email: "stranger@example.com", password: "hunter22" });

    const res = await strangerAgent.get(`/api/kits/${kit._id}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("forbids deleting a kit owned by someone else", async () => {
    const ownerAgent = request.agent(app);
    const ownerRes = await ownerAgent.post("/api/auth/register").send({ email: "owner3@example.com", password: "hunter22" });
    const kit = await KitModel.create({ ownerId: ownerRes.body.user.id, requestHash: "hash3", ...minimalKit() });

    const strangerAgent = request.agent(app);
    await strangerAgent.post("/api/auth/register").send({ email: "stranger2@example.com", password: "hunter22" });

    const res = await strangerAgent.delete(`/api/kits/${kit._id}`);
    expect(res.status).toBe(403);

    const stillExists = await KitModel.findById(kit._id);
    expect(stillExists).not.toBeNull();
  });

  it("only lists kits belonging to the requesting user", async () => {
    const agentA = request.agent(app);
    const resA = await agentA.post("/api/auth/register").send({ email: "userA@example.com", password: "hunter22" });
    await KitModel.create({ ownerId: resA.body.user.id, requestHash: "hashA", ...minimalKit() });

    const agentB = request.agent(app);
    const resB = await agentB.post("/api/auth/register").send({ email: "userB@example.com", password: "hunter22" });
    await KitModel.create({ ownerId: resB.body.user.id, requestHash: "hashB", ...minimalKit() });

    const listA = await agentA.get("/api/kits");
    expect(listA.body.kits).toHaveLength(1);

    const listB = await agentB.get("/api/kits");
    expect(listB.body.kits).toHaveLength(1);
  });
});
