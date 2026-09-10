import type { CompanyBrief, Question, Requirement } from "../../validation/kitSchema.js";
import { generateQuestionsForCategory } from "./questionGenerator.js";
import type { QuestionCategoryKey } from "../../prompts/questionGeneration.v1.js";
import type { InterviewDiscussionHit } from "../retrieval/interviewSearch.js";

const KIND_TO_CATEGORY: Record<Requirement["kind"], QuestionCategoryKey> = {
  technical: "technical",
  behavioural: "behavioural",
  domain: "company-fit",
};

export interface GapFillParams {
  uncoveredMustRequirements: Requirement[];
  allRequirements: Requirement[];
  roleTitle: string;
  seniority: string;
  companyBrief?: CompanyBrief;
  interviewDiscussion?: InterviewDiscussionHit[];
  idOffset: number;
}

/**
 * Second-generation-pass gap filler: generates targeted questions ONLY for
 * requirements the deterministic coverage checker found uncovered. Groups
 * requirements by their natural question category and issues one focused
 * generation call per group (not one call per requirement) to stay within
 * rate limits.
 */
export async function generateGapQuestions(params: GapFillParams): Promise<Question[]> {
  const { uncoveredMustRequirements } = params;
  if (uncoveredMustRequirements.length === 0) return [];

  const allRequirementIds = new Set(params.allRequirements.map((r) => r.id));
  const groups = new Map<QuestionCategoryKey, Requirement[]>();
  for (const req of uncoveredMustRequirements) {
    const category = KIND_TO_CATEGORY[req.kind];
    const list = groups.get(category) ?? [];
    list.push(req);
    groups.set(category, list);
  }

  const newQuestions: Question[] = [];
  let idOffset = params.idOffset;

  for (const [category, requirements] of groups) {
    const generated = await generateQuestionsForCategory(
      {
        category,
        roleTitle: params.roleTitle,
        seniority: params.seniority,
        relevantRequirements: requirements,
        companyBrief: params.companyBrief,
        interviewDiscussion: category === "company-fit" ? params.interviewDiscussion : undefined,
        maxQuestions: requirements.length,
        idOffset,
      },
      allRequirementIds,
    );
    newQuestions.push(...generated);
    idOffset += generated.length;
  }

  return newQuestions;
}
