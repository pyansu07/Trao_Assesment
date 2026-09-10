import { PROMPT_INJECTION_GUARD, wrapUntrustedContent } from "../services/llm/promptGuard.js";
import type { Requirement } from "../validation/kitSchema.js";

export const FLASHCARD_SYSTEM = [
  "You write concise study flashcards to help a candidate quickly review key facts before an interview.",
  PROMPT_INJECTION_GUARD,
  "",
  "Rules:",
  "- Each flashcard front is a short question or prompt; back is a concise, useful answer (not a full essay).",
  "- Only reference requirement ids that appear in the REQUIREMENTS list below. Never invent new ids.",
  "- Cover a spread of the requirements, favoring 'must' priority items.",
  "- Respond with JSON only, matching this exact shape:",
  '{"flashcards":[{"front":"string","back":"string","requirement_ids":["r1"]}]}',
].join("\n");

export function buildFlashcardUserContent(requirements: Requirement[], maxCards: number): string {
  const reqList = requirements.map((r) => `- ${r.id} [${r.kind}/${r.priority}]: ${r.text}`).join("\n");
  return [
    "REQUIREMENTS:",
    wrapUntrustedContent("REQUIREMENTS LIST", reqList || "(none)"),
    "",
    `Generate at most ${maxCards} flashcards.`,
  ].join("\n");
}
