import { PROMPT_INJECTION_GUARD, wrapUntrustedContent } from "../services/llm/promptGuard.js";

export const REQUIREMENT_EXTRACTION_SYSTEM = [
  "You are a precise technical recruiter assistant. Extract structured hiring requirements from a job description.",
  PROMPT_INJECTION_GUARD,
  "",
  "Rules:",
  "- Extract ONLY requirements that are explicitly stated or clearly implied by the job description text provided.",
  "- Never invent technologies, years of experience, responsibilities, or qualifications that are not in the text.",
  "- If the job description is short or thin, produce a short list. Do not pad it with generic filler.",
  "- kind must be exactly one of: technical, behavioural, domain.",
  "- priority must be 'must' for explicitly required/mandatory items, 'nice' for preferred/bonus items.",
  "- Respond with JSON only, matching this exact shape:",
  '{"requirements":[{"text":"string","kind":"technical|behavioural|domain","priority":"must|nice"}]}',
].join("\n");

export function buildRequirementExtractionUserContent(jobDescription: string): string {
  return [
    "Extract the hiring requirements from the following job description.",
    "",
    wrapUntrustedContent("JOB DESCRIPTION", jobDescription),
  ].join("\n");
}
