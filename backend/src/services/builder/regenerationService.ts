import type { QuestionCategoryValue, Requirement } from "../../validation/kitSchema.js";
import { applyKitMutation, getKitOwnedAsJson } from "../persistence/kitRepository.js";
import { generateQuestionsForCategory } from "../generation/questionGenerator.js";
import { generateFlashcards } from "../generation/flashcardGenerator.js";
import { generateCompanyBrief } from "../generation/companyBriefGenerator.js";
import { crawlCompanySite } from "../retrieval/companyCrawler.js";
import { buildSchedule } from "../scheduling/scheduleBuilder.js";
import { QUESTION_CATEGORIES } from "../evaluation/pipeline.js";
import {
  regenerateQuestionCategory,
  regenerateFlashcards as applyFlashcardRegeneration,
  regenerateCompanyBrief as applyCompanyBriefRegeneration,
  replaceSchedule,
} from "./kitBuilder.js";
import { AppError } from "../../utils/AppError.js";

function relevantRequirementsFor(category: QuestionCategoryValue, requirements: Requirement[]): Requirement[] {
  const spec = QUESTION_CATEGORIES.find((c) => c.category === category);
  if (!spec) throw new AppError("INVALID_INPUT", `Unknown question category ${category}`);
  return spec.kindFilter
    ? requirements.filter((r) => r.kind === spec.kindFilter)
    : requirements.filter((r) => r.kind === "technical" || r.kind === "domain");
}

export async function regenerateQuestionsSection(
  ownerId: string,
  kitId: string,
  category: QuestionCategoryValue,
  force: boolean,
) {
  const { kit } = await getKitOwnedAsJson(ownerId, kitId);
  const requirements = kit.role.requirements;
  const spec = QUESTION_CATEGORIES.find((c) => c.category === category);
  const relevant = relevantRequirementsFor(category, requirements);
  const allRequirementIds = new Set(requirements.map((r) => r.id));

  const fresh = await generateQuestionsForCategory(
    {
      category,
      roleTitle: kit.role.title,
      seniority: kit.role.seniority,
      relevantRequirements: relevant,
      companyBrief: kit.company_brief,
      maxQuestions: spec?.max ?? 4,
      idOffset: 0,
    },
    allRequirementIds,
  );

  return applyKitMutation(ownerId, kitId, (current) =>
    regenerateQuestionCategory(
      current,
      category,
      fresh.map(({ id: _id, state: _state, ...rest }) => rest),
      { force },
    ),
  );
}

export async function regenerateFlashcardsSection(ownerId: string, kitId: string, force: boolean) {
  const { kit } = await getKitOwnedAsJson(ownerId, kitId);
  const fresh = await generateFlashcards(kit.role.requirements);
  return applyKitMutation(ownerId, kitId, (current) =>
    applyFlashcardRegeneration(
      current,
      fresh.map(({ id: _id, state: _state, ...rest }) => rest),
      { force },
    ),
  );
}

export async function regenerateCompanyBriefSection(ownerId: string, kitId: string, force: boolean) {
  const { kit } = await getKitOwnedAsJson(ownerId, kitId);
  const companyUrl = kit.source.company_url;
  const crawl = await crawlCompanySite(companyUrl);
  const fresh = await generateCompanyBrief(companyUrl, crawl.pagesUsed);
  return applyKitMutation(ownerId, kitId, (current) => applyCompanyBriefRegeneration(current, fresh, { force }));
}

export async function regenerateScheduleSection(ownerId: string, kitId: string, days?: number) {
  const { kit } = await getKitOwnedAsJson(ownerId, kitId);
  const daysAvailable = days ?? kit.schedule.days_available;
  const schedule = buildSchedule({ requirements: kit.role.requirements, questions: kit.questions, daysAvailable });
  return applyKitMutation(ownerId, kitId, (current) => replaceSchedule(current, schedule));
}
