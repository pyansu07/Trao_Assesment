import { z } from "zod";
import { RequirementKind, RequirementPriority, type Requirement } from "../../validation/kitSchema.js";
import { generateStructured } from "../llm/structuredGenerate.js";
import {
  REQUIREMENT_EXTRACTION_SYSTEM,
  buildRequirementExtractionUserContent,
} from "../../prompts/requirementExtraction.v1.js";

const LlmRequirementsSchema = z.object({
  requirements: z
    .array(
      z.object({
        text: z.string().min(1),
        kind: RequirementKind,
        priority: RequirementPriority,
      }),
    )
    .max(40),
});

/** Extracts requirements from a JD via a focused LLM call, then assigns stable IDs. */
export async function extractRequirements(jobDescription: string): Promise<Requirement[]> {
  const result = await generateStructured({
    systemInstruction: REQUIREMENT_EXTRACTION_SYSTEM,
    userContent: buildRequirementExtractionUserContent(jobDescription),
    schema: LlmRequirementsSchema,
    temperature: 0.2,
  });

  return result.requirements.map((r, index) => ({
    id: `r${index + 1}`,
    text: r.text,
    kind: r.kind,
    priority: r.priority,
  }));
}
