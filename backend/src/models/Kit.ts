import mongoose, { Schema, type InferSchemaType } from "mongoose";

const RequirementSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ["technical", "behavioural", "domain"], required: true },
    priority: { type: String, enum: ["must", "nice"], required: true },
  },
  { _id: false },
);

const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    requirement_ids: { type: [String], default: [] },
    category: { type: String, enum: ["technical", "behavioural", "system-design", "company-fit"], required: true },
    prompt: { type: String, required: true },
    answer_outline: { type: String, required: true },
    difficulty: { type: Number, enum: [1, 2, 3], required: true },
    state: { type: String, enum: ["generated", "edited", "pinned"], default: "generated" },
  },
  { _id: false },
);

const FlashcardSchema = new Schema(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    requirement_ids: { type: [String], default: [] },
    state: { type: String, enum: ["generated", "edited", "pinned"], default: "generated" },
    practice: {
      confidence: { type: String, enum: ["low", "medium", "high", null], default: null },
      reviewCount: { type: Number, default: 0 },
      lastReviewedAt: { type: String, default: null },
    },
  },
  { _id: false },
);

const ScheduleDaySchema = new Schema(
  {
    day: { type: Number, required: true },
    focus: { type: String, required: true },
    question_ids: { type: [String], default: [] },
    minutes: { type: Number, required: true },
  },
  { _id: false },
);

const KitSchemaDef = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestHash: { type: String, index: true },
    source: {
      company: { type: String, default: "" },
      company_url: { type: String, default: "" },
      role: { type: String, default: "" },
      location: { type: String, default: "" },
      jd_chars: { type: Number, default: 0 },
      researched_at: { type: String, default: "" },
      pages_used: { type: [String], default: [] },
    },
    company_brief: {
      summary: { type: String, default: "" },
      what_they_do: { type: String, default: "" },
      sources: { type: [String], default: [] },
      state: { type: String, enum: ["generated", "edited", "pinned"], default: "generated" },
    },
    role: {
      title: { type: String, default: "" },
      seniority: { type: String, default: "" },
      responsibilities: { type: [String], default: [] },
      requirements: { type: [RequirementSchema], default: [] },
    },
    questions: { type: [QuestionSchema], default: [] },
    flashcards: { type: [FlashcardSchema], default: [] },
    schedule: {
      days_available: { type: Number, default: 0 },
      days: { type: [ScheduleDaySchema], default: [] },
    },
    coverage: {
      uncovered_requirement_ids: { type: [String], default: [] },
      passes: { type: Number, default: 1 },
    },
    generationMeta: {
      warnings: { type: [{ stage: String, message: String }], default: [] },
      retrievalFailures: { type: [{ url: String, reason: String }], default: [] },
      interviewDiscussion: {
        found: { type: Boolean, default: false },
        note: { type: String, default: null },
        results: {
          type: [{ title: String, url: String, snippet: String }],
          default: [],
        },
      },
    },
  },
  { timestamps: true },
);

KitSchemaDef.index({ ownerId: 1, createdAt: -1 });

export type KitDoc = mongoose.HydratedDocument<InferSchemaType<typeof KitSchemaDef>>;

export const KitModel = mongoose.model("Kit", KitSchemaDef);
