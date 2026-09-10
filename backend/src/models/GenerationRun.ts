import mongoose, { Schema, type InferSchemaType } from "mongoose";

const StageEventSchema = new Schema(
  {
    stage: { type: String, required: true },
    status: { type: String, enum: ["started", "completed", "failed"], required: true },
    detail: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const GenerationRunSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestHash: { type: String, required: true, index: true },
    batchId: { type: String, index: true, default: null },
    caseId: { type: String, default: null },
    input: {
      jd: { type: String, required: true },
      company_url: { type: String, required: true },
      days: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
      index: true,
    },
    stages: { type: [StageEventSchema], default: [] },
    kitId: { type: Schema.Types.ObjectId, ref: "Kit", default: null },
    error: {
      code: { type: String },
      message: { type: String },
    },
  },
  { timestamps: true },
);

// Atomic idempotency guard: at most one pending/running run per
// (owner, requestHash) can exist at the database level. This is enforced
// via a partial unique index rather than an application-level
// find-then-create check, which would have a TOCTOU race under genuinely
// concurrent requests (verified by src/tests/idempotency.test.ts).
GenerationRunSchema.index(
  { ownerId: 1, requestHash: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "running"] } } },
);

export type GenerationRunDoc = mongoose.HydratedDocument<InferSchemaType<typeof GenerationRunSchema>>;

export const GenerationRun = mongoose.model("GenerationRun", GenerationRunSchema);
