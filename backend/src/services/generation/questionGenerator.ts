import { z } from "zod";
import { Difficulty, type CompanyBrief, type Question, type Requirement } from "../../validation/kitSchema.js";
import { generateStructured } from "../llm/structuredGenerate.js";
import {
  buildQuestionGenerationSystem,
  buildQuestionGenerationUserContent,
  type QuestionCategoryKey,
} from "../../prompts/questionGeneration.v1.js";
import type { InterviewDiscussionHit } from "../retrieval/interviewSearch.js";

const LlmQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        requirement_ids: z.array(z.string()).default([]),
        prompt: z.string().min(1),
        answer_outline: z.string().min(1),
        difficulty: Difficulty,
      }),
    )
    .max(10),
});

export interface GenerateQuestionsParams {
  category: QuestionCategoryKey;
  roleTitle: string;
  seniority: string;
  relevantRequirements: Requirement[];
  companyBrief?: CompanyBrief;
  interviewDiscussion?: InterviewDiscussionHit[];
  maxQuestions: number;
  idOffset: number;
}

/** Sanitizes requirement_ids against the actual known requirement set - drops any hallucinated id. */
function sanitizeRequirementIds(ids: string[], validIds: Set<string>): string[] {
  return ids.filter((id) => validIds.has(id));
}

export async function generateQuestionsForCategory(
  params: GenerateQuestionsParams,
  allRequirementIds: Set<string>,
): Promise<Question[]> {
  const { category, relevantRequirements, companyBrief } = params;

  // Skip categories with nothing to base questions on, rather than asking
  // the model to invent content from thin air (except company-fit, which
  // legitimately can rely on the company brief alone).
  if (category !== "company-fit" && relevantRequirements.length === 0) {
    return [];
  }
  if (category === "company-fit" && !companyBrief) {
    return [];
  }

  const result = await generateStructured({
    systemInstruction: buildQuestionGenerationSystem(category),
    userContent: buildQuestionGenerationUserContent({
      roleTitle: params.roleTitle,
      seniority: params.seniority,
      requirements: relevantRequirements,
      companyBrief,
      interviewDiscussion: category === "company-fit" ? params.interviewDiscussion : undefined,
      maxQuestions: params.maxQuestions,
    }),
    schema: LlmQuestionsSchema,
    temperature: 0.5,
  });

  return result.questions.slice(0, params.maxQuestions).map((q, index) => ({
    id: `q${params.idOffset + index + 1}`,
    requirement_ids: sanitizeRequirementIds(q.requirement_ids, allRequirementIds),
    category,
    prompt: q.prompt,
    answer_outline: q.answer_outline,
    difficulty: q.difficulty,
    state: "generated" as const,
  }));
}
