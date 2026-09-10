import { PROMPT_INJECTION_GUARD, wrapUntrustedContent } from "../services/llm/promptGuard.js";

export const ROLE_SYNTHESIS_SYSTEM = [
  "You summarize a job posting into a short role profile for interview preparation.",
  PROMPT_INJECTION_GUARD,
  "",
  "Rules:",
  "- Base title/seniority/responsibilities ONLY on the job description text provided.",
  "- seniority should be a short label such as 'junior', 'mid-level', 'senior', 'staff', or 'not specified' if the JD does not indicate one.",
  "- responsibilities should be short bullet-style phrases, only what the JD actually describes.",
  "- location should be the work location/city/remote-status if the JD states one, otherwise an empty string. Never guess.",
  "- Respond with JSON only, matching this exact shape:",
  '{"title":"string","seniority":"string","location":"string","responsibilities":["string", "..."]}',
].join("\n");

export function buildRoleSynthesisUserContent(jobDescription: string): string {
  return [
    "Summarize the role described in the following job description.",
    "",
    wrapUntrustedContent("JOB DESCRIPTION", jobDescription),
  ].join("\n");
}
