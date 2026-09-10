export type ContentState = "generated" | "edited" | "pinned";
export type RequirementKind = "technical" | "behavioural" | "domain";
export type RequirementPriority = "must" | "nice";
export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";
export type Difficulty = 1 | 2 | 3;
export type Confidence = "low" | "medium" | "high";

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: Difficulty;
  state: ContentState;
}

export interface FlashcardPractice {
  confidence: Confidence | null;
  reviewCount: number;
  lastReviewedAt: string | null;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  state: ContentState;
  practice: FlashcardPractice;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface Source {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
  state: ContentState;
}

export interface Role {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface Kit {
  source: Source;
  company_brief: CompanyBrief;
  role: Role;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

export interface KitListItem {
  _id: string;
  source: Source;
  company_brief: { summary: string };
  schedule: { days_available: number };
  coverage: Coverage;
  createdAt: string;
  updatedAt: string;
}

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
  at: string;
}

export interface GenerationRun {
  _id: string;
  status: "pending" | "running" | "completed" | "failed";
  stages: StageEvent[];
  kitId: string | null;
  error: { code: string; message: string } | null;
  input: { jd: string; company_url: string; days: number };
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface InterviewDiscussionHit {
  title: string;
  url: string;
  snippet: string;
}

export interface GenerationMeta {
  warnings?: { stage: string; message: string }[];
  retrievalFailures?: { url: string; reason: string }[];
  interviewDiscussion?: {
    found: boolean;
    note?: string | null;
    results: InterviewDiscussionHit[];
  };
}
