import { z } from "zod";
import type { CompanyBrief } from "../../validation/kitSchema.js";
import { generateStructured } from "../llm/structuredGenerate.js";
import { COMPANY_BRIEF_SYSTEM, buildCompanyBriefUserContent } from "../../prompts/companyBrief.v1.js";
import type { CrawledPage } from "../retrieval/companyCrawler.js";

const LlmCompanyBriefSchema = z.object({
  summary: z.string().min(1),
  what_they_do: z.string().min(1),
});

/**
 * Generates the company brief from actually-retrieved pages only. `sources`
 * is derived directly from the URLs that were fetched - never fabricated by
 * the model.
 */
export async function generateCompanyBrief(companyUrl: string, pages: CrawledPage[]): Promise<CompanyBrief> {
  if (pages.length === 0) {
    return {
      summary: "No company information could be retrieved from the provided URL.",
      what_they_do: "Unknown - the company website was unreachable during research.",
      sources: [],
      state: "generated",
    };
  }

  const result = await generateStructured({
    systemInstruction: COMPANY_BRIEF_SYSTEM,
    userContent: buildCompanyBriefUserContent(companyUrl, pages),
    schema: LlmCompanyBriefSchema,
    temperature: 0.3,
  });

  return {
    summary: result.summary,
    what_they_do: result.what_they_do,
    sources: pages.map((p) => p.url),
    state: "generated",
  };
}
