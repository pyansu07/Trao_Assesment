import { PROMPT_INJECTION_GUARD, wrapUntrustedContent } from "../services/llm/promptGuard.js";
import type { CompanyBrief, Requirement } from "../validation/kitSchema.js";
import type { InterviewDiscussionHit } from "../services/retrieval/interviewSearch.js";

export type QuestionCategoryKey = "technical" | "behavioural" | "system-design" | "company-fit";

const CATEGORY_FOCUS: Record<QuestionCategoryKey, string> = {
  technical:
    "Generate TECHNICAL interview questions that test the candidate's ability to meet the requirements listed below.",
  behavioural:
    "Generate BEHAVIOURAL interview questions that probe the candidate's fit for the requirements/responsibilities listed below (e.g. teamwork, mentoring, conflict, ownership).",
  "system-design":
    "Generate SYSTEM-DESIGN interview questions appropriate for the role's seniority, informed by the technical/domain requirements listed below.",
  "company-fit":
    "Generate COMPANY-FIT interview questions that connect the candidate's motivation and background to this specific company, based on the company brief provided. If public discussion of this company's actual interview process is provided below, let it inform realistic question framing (e.g. rounds/format candidates report), but never assert those third-party reports as confirmed fact.",
};

export function buildQuestionGenerationSystem(category: QuestionCategoryKey): string {
  return [
    `You write interview questions for a specific category: ${category}.`,
    PROMPT_INJECTION_GUARD,
    "",
    CATEGORY_FOCUS[category],
    "Rules:",
    "- Only reference requirement ids that appear in the REQUIREMENTS list below. Never invent new ids.",
    "- Every question needs requirement_ids: an array of 1+ ids it tests, EXCEPT company-fit questions may use an empty array when no listed requirement is a natural fit.",
    "- difficulty must be an integer: 1 (straightforward), 2 (intermediate), or 3 (challenging).",
    "- answer_outline is a concise outline of what a strong answer covers (2-5 short points), not a full essay.",
    "- Generate only as many questions as are genuinely justified by the requirements given - do not pad with filler or near-duplicates.",
    "- Respond with JSON only, matching this exact shape:",
    '{"questions":[{"requirement_ids":["r1"],"prompt":"string","answer_outline":"string","difficulty":1}]}',
  ].join("\n");
}

export interface QuestionGenerationContext {
  roleTitle: string;
  seniority: string;
  requirements: Requirement[];
  companyBrief?: CompanyBrief;
  interviewDiscussion?: InterviewDiscussionHit[];
  maxQuestions: number;
}

export function buildQuestionGenerationUserContent(ctx: QuestionGenerationContext): string {
  const reqList =
    ctx.requirements.length > 0
      ? ctx.requirements.map((r) => `- ${r.id} [${r.kind}/${r.priority}]: ${r.text}`).join("\n")
      : "(no directly relevant requirements were extracted - rely on the role/company context below)";

  const parts = [
    `Role: ${ctx.roleTitle || "(unspecified)"} (${ctx.seniority || "seniority not specified"})`,
    "",
    "REQUIREMENTS:",
    reqList,
  ];

  if (ctx.companyBrief) {
    parts.push(
      "",
      wrapUntrustedContent(
        "COMPANY BRIEF CONTEXT",
        `${ctx.companyBrief.summary}\n${ctx.companyBrief.what_they_do}`,
      ),
    );
  }

  if (ctx.interviewDiscussion && ctx.interviewDiscussion.length > 0) {
    const discussionText = ctx.interviewDiscussion
      .map((hit) => `- ${hit.title} (${hit.url}): ${hit.snippet}`)
      .join("\n");
    parts.push(
      "",
      wrapUntrustedContent(
        "PUBLIC DISCUSSION OF THIS COMPANY'S INTERVIEW PROCESS (unverified third-party search snippets)",
        discussionText,
      ),
    );
  }

  parts.push("", `Generate at most ${ctx.maxQuestions} questions.`);
  return parts.join("\n");
}
