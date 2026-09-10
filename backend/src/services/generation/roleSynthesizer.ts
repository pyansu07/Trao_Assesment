import { z } from "zod";
import { generateStructured } from "../llm/structuredGenerate.js";
import { ROLE_SYNTHESIS_SYSTEM, buildRoleSynthesisUserContent } from "../../prompts/roleSynthesis.v1.js";

const LlmRoleSchema = z.object({
  title: z.string().min(1),
  seniority: z.string().min(1),
  location: z.string().default(""),
  responsibilities: z.array(z.string()).max(20),
});

export interface RoleSummary {
  title: string;
  seniority: string;
  location: string;
  responsibilities: string[];
}

export async function synthesizeRole(jobDescription: string): Promise<RoleSummary> {
  return generateStructured({
    systemInstruction: ROLE_SYNTHESIS_SYSTEM,
    userContent: buildRoleSynthesisUserContent(jobDescription),
    schema: LlmRoleSchema,
    temperature: 0.2,
  });
}
