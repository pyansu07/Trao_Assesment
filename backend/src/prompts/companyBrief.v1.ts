import { PROMPT_INJECTION_GUARD, wrapUntrustedContent } from "../services/llm/promptGuard.js";
import type { CrawledPage } from "../services/retrieval/companyCrawler.js";

export const COMPANY_BRIEF_SYSTEM = [
  "You are a research analyst writing a short, honest company brief for a job candidate preparing for an interview.",
  PROMPT_INJECTION_GUARD,
  "",
  "Rules:",
  "- Base the brief ONLY on the page content provided below. Never invent facts, products, numbers, or history not present in the text.",
  "- If the provided pages contain little usable information, write a short, honest brief that says so rather than padding it with generic claims.",
  "- Do not mention specific interview rounds/questions here even if present in the pages - that belongs elsewhere.",
  "- Respond with JSON only, matching this exact shape:",
  '{"summary":"string (2-4 sentences)","what_they_do":"string (1-3 sentences on their product/business)"}',
].join("\n");

export function buildCompanyBriefUserContent(companyUrl: string, pages: CrawledPage[]): string {
  if (pages.length === 0) {
    return [
      `The company website (${companyUrl}) could not be retrieved.`,
      "No page content is available. Produce an honest, minimal brief noting that no company information could be retrieved.",
    ].join("\n");
  }
  const pageBlocks = pages
    .map((p, i) => wrapUntrustedContent(`COMPANY PAGE ${i + 1} (${p.url})`, `Title: ${p.title}\n${p.text}`))
    .join("\n\n");
  return [`Company website: ${companyUrl}`, "", pageBlocks].join("\n");
}
