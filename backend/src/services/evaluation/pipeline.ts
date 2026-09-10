import { AppError } from "../../utils/AppError.js";
import { validateKit, type CompanyBrief, type Kit, type Question, type Requirement } from "../../validation/kitSchema.js";
import type { PipelineInput } from "../../validation/pipelineInput.js";
import { crawlCompanySite, type CrawlFailure } from "../retrieval/companyCrawler.js";
import { searchPublicInterviewDiscussion } from "../retrieval/interviewSearch.js";
import { deriveCompanyName } from "../retrieval/companyName.js";
import { extractRequirements } from "../extraction/requirementExtractor.js";
import { generateCompanyBrief } from "../generation/companyBriefGenerator.js";
import { synthesizeRole, type RoleSummary } from "../generation/roleSynthesizer.js";
import { generateQuestionsForCategory } from "../generation/questionGenerator.js";
import { generateFlashcards } from "../generation/flashcardGenerator.js";
import { generateGapQuestions } from "../generation/gapQuestionGenerator.js";
import { computeUncoveredMustRequirements, computeUncoveredRequirementIds } from "../coverage/coverageChecker.js";
import { buildSchedule } from "../scheduling/scheduleBuilder.js";
import type { QuestionCategoryKey } from "../../prompts/questionGeneration.v1.js";

// ---------------------------------------------------------------------------
// THE single pipeline implementation. Both the web API (via the generation
// job runner) and `npm run evaluate` call this exact function - there is no
// separate/duplicated logic for batch evaluation.
//
// Stage sequence (matches the assessment's suggested generation UX stages):
//   1. Reading job description
//   2. Researching company
//   3. Finding hiring information         (folded into company research)
//   4. Reviewing public interview discussion
//   5. Extracting requirements
//   6. Generating questions (technical/behavioural/system-design/company-fit)
//   7. Generating flashcards
//   8. Checking coverage
//   9. Filling coverage gaps
//  10. Building schedule
//  11. Validating kit
//
// Deterministic coverage + scheduling are pure code (see ../coverage and
// ../scheduling) - the LLM never decides either.
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "reading_job_description"
  | "researching_company"
  | "reviewing_public_discussion"
  | "extracting_requirements"
  | "generating_company_brief"
  | "synthesizing_role"
  | "generating_questions"
  | "generating_flashcards"
  | "checking_coverage"
  | "filling_coverage_gaps"
  | "building_schedule"
  | "validating_kit";

export interface StageEvent {
  stage: PipelineStage;
  status: "started" | "completed" | "failed";
  detail?: string;
}

export interface PipelineOptions {
  onStage?: (event: StageEvent) => void;
}

export interface PipelineWarning {
  stage: string;
  message: string;
}

export interface PipelineResult {
  kit: Kit;
  warnings: PipelineWarning[];
  retrievalFailures: CrawlFailure[];
  interviewDiscussion: { found: boolean; results: { title: string; url: string; snippet: string }[]; note?: string };
}

export const QUESTION_CATEGORIES: { category: QuestionCategoryKey; max: number; kindFilter?: Requirement["kind"] }[] = [
  { category: "technical", max: 6, kindFilter: "technical" },
  { category: "behavioural", max: 4, kindFilter: "behavioural" },
  { category: "system-design", max: 3 },
  { category: "company-fit", max: 3 },
];

function emit(opts: PipelineOptions | undefined, stage: PipelineStage, status: StageEvent["status"], detail?: string) {
  opts?.onStage?.({ stage, status, detail });
}

async function safeStage<T>(
  opts: PipelineOptions | undefined,
  stage: PipelineStage,
  warnings: PipelineWarning[],
  fallback: T,
  fn: () => Promise<T>,
): Promise<T> {
  emit(opts, stage, "started");
  try {
    const result = await fn();
    emit(opts, stage, "completed");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push({ stage, message });
    emit(opts, stage, "failed", message);
    return fallback;
  }
}

export async function runGenerationPipeline(input: PipelineInput, opts?: PipelineOptions): Promise<PipelineResult> {
  const warnings: PipelineWarning[] = [];

  emit(opts, "reading_job_description", "started");
  const jd = input.jd.trim();
  emit(opts, "reading_job_description", "completed");

  // --- research -------------------------------------------------------
  emit(opts, "researching_company", "started");
  const crawl = await crawlCompanySite(input.company_url).catch((err) => {
    warnings.push({ stage: "researching_company", message: err instanceof Error ? err.message : String(err) });
    return { homepageFetched: false, pagesUsed: [], failures: [{ url: input.company_url, reason: String(err) }] };
  });
  for (const failure of crawl.failures) {
    warnings.push({ stage: "researching_company", message: `${failure.url}: ${failure.reason}` });
  }
  emit(opts, "researching_company", "completed", `${crawl.pagesUsed.length} page(s) retrieved`);

  const companyName = deriveCompanyName(crawl.pagesUsed, input.company_url);

  emit(opts, "reviewing_public_discussion", "started");
  const discussion = await searchPublicInterviewDiscussion(companyName);
  if (!discussion.found) {
    warnings.push({ stage: "reviewing_public_discussion", message: discussion.note ?? "No public discussion found" });
  }
  emit(opts, "reviewing_public_discussion", "completed", discussion.found ? `${discussion.results.length} hit(s)` : "none found");

  // --- extraction (required - everything downstream depends on it) ----
  emit(opts, "extracting_requirements", "started");
  let requirements: Requirement[];
  try {
    requirements = await extractRequirements(jd);
  } catch (err) {
    emit(opts, "extracting_requirements", "failed");
    if (err instanceof AppError) throw err;
    throw new AppError("LLM_UNAVAILABLE", `Requirement extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  emit(opts, "extracting_requirements", "completed", `${requirements.length} requirement(s)`);

  // --- company brief + role (best-effort, graceful fallback) ----------
  const companyBrief: CompanyBrief = await safeStage(
    opts,
    "generating_company_brief",
    warnings,
    {
      summary: "Company research could not be completed.",
      what_they_do: "Unknown.",
      sources: crawl.pagesUsed.map((p) => p.url),
      state: "generated" as const,
    },
    () => generateCompanyBrief(input.company_url, crawl.pagesUsed),
  );

  const role: RoleSummary = await safeStage(
    opts,
    "synthesizing_role",
    warnings,
    { title: "Not specified", seniority: "not specified", location: "", responsibilities: [] },
    () => synthesizeRole(jd),
  );

  // --- question generation (per category, best-effort) ----------------
  emit(opts, "generating_questions", "started");
  const allRequirementIds = new Set(requirements.map((r) => r.id));
  const questions: Question[] = [];
  for (const spec of QUESTION_CATEGORIES) {
    const relevant = spec.kindFilter ? requirements.filter((r) => r.kind === spec.kindFilter) : requirements.filter((r) => r.kind === "technical" || r.kind === "domain");
    const generated = await safeStage(opts, "generating_questions", warnings, [] as Question[], () =>
      generateQuestionsForCategory(
        {
          category: spec.category,
          roleTitle: role.title,
          seniority: role.seniority,
          relevantRequirements: relevant,
          companyBrief,
          interviewDiscussion: discussion.found ? discussion.results : undefined,
          maxQuestions: spec.max,
          idOffset: questions.length,
        },
        allRequirementIds,
      ),
    );
    questions.push(...generated);
  }
  emit(opts, "generating_questions", "completed", `${questions.length} question(s)`);

  // --- flashcards -------------------------------------------------------
  const flashcards = await safeStage(opts, "generating_flashcards", warnings, [], () => generateFlashcards(requirements));

  // --- deterministic coverage pass 1 ------------------------------------
  emit(opts, "checking_coverage", "started");
  let uncoveredMust = computeUncoveredMustRequirements(requirements, questions);
  emit(opts, "checking_coverage", "completed", `${uncoveredMust.length} uncovered MUST requirement(s)`);

  // --- second generation pass: gap-fill uncovered MUST requirements ----
  let passes = 1;
  if (uncoveredMust.length > 0) {
    emit(opts, "filling_coverage_gaps", "started");
    const gapQuestions = await safeStage(opts, "filling_coverage_gaps", warnings, [] as Question[], () =>
      generateGapQuestions({
        uncoveredMustRequirements: uncoveredMust,
        allRequirements: requirements,
        roleTitle: role.title,
        seniority: role.seniority,
        companyBrief,
        interviewDiscussion: discussion.found ? discussion.results : undefined,
        idOffset: questions.length,
      }),
    );
    questions.push(...gapQuestions);
    passes = 2;
    uncoveredMust = computeUncoveredMustRequirements(requirements, questions);
    if (uncoveredMust.length > 0) {
      warnings.push({
        stage: "filling_coverage_gaps",
        message: `${uncoveredMust.length} MUST requirement(s) remained uncovered after the gap-fill pass: ${uncoveredMust.map((r) => r.id).join(", ")}`,
      });
    }
    emit(opts, "filling_coverage_gaps", "completed", `${uncoveredMust.length} still uncovered`);
  }

  const uncoveredRequirementIds = computeUncoveredRequirementIds(requirements, questions);

  // --- deterministic schedule --------------------------------------------
  emit(opts, "building_schedule", "started");
  const schedule = buildSchedule({ requirements, questions, daysAvailable: input.days });
  emit(opts, "building_schedule", "completed");

  // --- assemble + validate -------------------------------------------------
  emit(opts, "validating_kit", "started");
  const candidate = {
    source: {
      company: companyName,
      company_url: input.company_url,
      role: role.title,
      location: role.location,
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pagesUsed.map((p) => p.url),
    },
    company_brief: companyBrief,
    role: {
      title: role.title,
      seniority: role.seniority,
      responsibilities: role.responsibilities,
      requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: uncoveredRequirementIds,
      passes,
    },
  };

  let kit: Kit;
  try {
    kit = validateKit(candidate);
  } catch (err) {
    emit(opts, "validating_kit", "failed");
    throw err;
  }
  emit(opts, "validating_kit", "completed");

  return { kit, warnings, retrievalFailures: crawl.failures, interviewDiscussion: discussion };
}
