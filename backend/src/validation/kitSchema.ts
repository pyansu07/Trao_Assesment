import { z } from "zod";

// ---------------------------------------------------------------------------
// Exact schema per assessment Appendix A. Field names, enums and structure
// must match exactly. This is the single source of truth for kit shape -
// generation, persistence and the API all validate against this schema.
// ---------------------------------------------------------------------------

export const RequirementKind = z.enum(["technical", "behavioural", "domain"]);
export const RequirementPriority = z.enum(["must", "nice"]);
export const QuestionCategory = z.enum([
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
]);
export const Difficulty = z.union([z.literal(1), z.literal(2), z.literal(3)]);

// state metadata used by the builder to preserve edits during regeneration.
// Not part of the assessment's required fields on questions/flashcards, but
// additive - it does not remove or rename any required field.
export const ContentState = z.enum(["generated", "edited", "pinned"]);

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: RequirementKind,
  priority: RequirementPriority,
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string().min(1)),
  category: QuestionCategory,
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: Difficulty,
  state: ContentState.default("generated"),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
  state: ContentState.default("generated"),
  practice: z
    .object({
      confidence: z.enum(["low", "medium", "high"]).nullable().default(null),
      reviewCount: z.number().int().min(0).default(0),
      lastReviewedAt: z.string().nullable().default(null),
    })
    .default({ confidence: null, reviewCount: 0, lastReviewedAt: null }),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string().min(1),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(0),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().min(1).max(60),
  days: z.array(ScheduleDaySchema),
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().min(1),
});

export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().min(0),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
  state: ContentState.default("generated"),
});

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

export const KitSchema = z
  .object({
    source: SourceSchema,
    company_brief: CompanyBriefSchema,
    role: RoleSchema,
    questions: z.array(QuestionSchema),
    flashcards: z.array(FlashcardSchema),
    schedule: ScheduleSchema,
    coverage: CoverageSchema,
  })
  .superRefine((kit, ctx) => {
    const requirementIds = new Set(kit.role.requirements.map((r) => r.id));
    const questionIds = new Set(kit.questions.map((q) => q.id));

    // unique ids
    if (requirementIds.size !== kit.role.requirements.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate requirement ids" });
    }
    if (questionIds.size !== kit.questions.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate question ids" });
    }
    const flashcardIds = new Set(kit.flashcards.map((f) => f.id));
    if (flashcardIds.size !== kit.flashcards.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate flashcard ids" });
    }

    // question.requirement_ids must reference real requirements
    kit.questions.forEach((q, qi) => {
      q.requirement_ids.forEach((rid) => {
        if (!requirementIds.has(rid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `question ${q.id} references unknown requirement ${rid}`,
            path: ["questions", qi, "requirement_ids"],
          });
        }
      });
    });

    // flashcard.requirement_ids must reference real requirements
    kit.flashcards.forEach((f, fi) => {
      f.requirement_ids.forEach((rid) => {
        if (!requirementIds.has(rid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `flashcard ${f.id} references unknown requirement ${rid}`,
            path: ["flashcards", fi, "requirement_ids"],
          });
        }
      });
    });

    // schedule.question_ids must reference real questions
    kit.schedule.days.forEach((day, di) => {
      day.question_ids.forEach((qid) => {
        if (!questionIds.has(qid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `schedule day ${day.day} references unknown question ${qid}`,
            path: ["schedule", "days", di, "question_ids"],
          });
        }
      });
    });

    // days_available must equal requested days, schedule length must equal requested days
    if (kit.schedule.days.length !== kit.schedule.days_available) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "schedule.days length must equal schedule.days_available",
        path: ["schedule", "days"],
      });
    }

    // coverage.uncovered_requirement_ids must reference real requirements
    kit.coverage.uncovered_requirement_ids.forEach((rid) => {
      if (!requirementIds.has(rid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `coverage references unknown requirement ${rid}`,
          path: ["coverage", "uncovered_requirement_ids"],
        });
      }
    });
  });

export type QuestionCategoryValue = z.infer<typeof QuestionCategory>;
export type DifficultyValue = z.infer<typeof Difficulty>;
export type RequirementKindValue = z.infer<typeof RequirementKind>;
export type RequirementPriorityValue = z.infer<typeof RequirementPriority>;

export type Kit = z.infer<typeof KitSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Source = z.infer<typeof SourceSchema>;

export class KitValidationError extends Error {
  issues: z.ZodIssue[];
  constructor(issues: z.ZodIssue[]) {
    super("Kit failed schema validation");
    this.issues = issues;
  }
}

export function validateKit(candidate: unknown): Kit {
  const result = KitSchema.safeParse(candidate);
  if (!result.success) {
    throw new KitValidationError(result.error.issues);
  }
  return result.data;
}
