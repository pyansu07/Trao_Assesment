import type { PipelineStage } from "./types";

export const STAGE_LABELS: Record<PipelineStage, string> = {
  reading_job_description: "Reading job description",
  researching_company: "Researching company",
  reviewing_public_discussion: "Reviewing public interview discussion",
  extracting_requirements: "Extracting requirements",
  generating_company_brief: "Writing company brief",
  synthesizing_role: "Summarizing the role",
  generating_questions: "Generating interview questions",
  generating_flashcards: "Generating flashcards",
  checking_coverage: "Checking requirement coverage",
  filling_coverage_gaps: "Filling coverage gaps",
  building_schedule: "Building study schedule",
  validating_kit: "Validating kit",
};

export const STAGE_ORDER: PipelineStage[] = [
  "reading_job_description",
  "researching_company",
  "reviewing_public_discussion",
  "extracting_requirements",
  "generating_company_brief",
  "synthesizing_role",
  "generating_questions",
  "generating_flashcards",
  "checking_coverage",
  "filling_coverage_gaps",
  "building_schedule",
  "validating_kit",
];
