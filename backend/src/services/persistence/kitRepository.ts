import { KitModel, type KitDoc } from "../../models/Kit.js";
import { validateKit, type Kit } from "../../validation/kitSchema.js";
import { AppError } from "../../utils/AppError.js";
import type { PipelineWarning } from "../evaluation/pipeline.js";
import type { CrawlFailure } from "../retrieval/companyCrawler.js";

const KIT_FIELDS: (keyof Kit)[] = [
  "source",
  "company_brief",
  "role",
  "questions",
  "flashcards",
  "schedule",
  "coverage",
];

function toKit(doc: KitDoc): Kit {
  const obj = doc.toObject({ versionKey: false }) as Record<string, unknown>;
  const kitFields: Record<string, unknown> = {};
  for (const field of KIT_FIELDS) kitFields[field] = obj[field];
  return validateKit(kitFields);
}

export async function findKitOwned(ownerId: string, kitId: string): Promise<KitDoc> {
  let doc;
  try {
    doc = await KitModel.findById(kitId);
  } catch {
    throw new AppError("NOT_FOUND", "Kit not found");
  }
  if (!doc) throw new AppError("NOT_FOUND", "Kit not found");
  if (doc.ownerId.toString() !== ownerId) throw new AppError("FORBIDDEN", "You do not have access to this kit");
  return doc as unknown as KitDoc;
}

export async function listKitsOwned(ownerId: string) {
  return KitModel.find({ ownerId })
    .sort({ createdAt: -1 })
    .select("source company_brief.summary schedule.days_available coverage createdAt updatedAt")
    .lean();
}

export async function createKit(
  ownerId: string,
  kit: Kit,
  meta: {
    warnings: PipelineWarning[];
    retrievalFailures: CrawlFailure[];
    interviewDiscussion?: { found: boolean; results: { title: string; url: string; snippet: string }[]; note?: string };
  },
  requestHash: string,
): Promise<KitDoc> {
  const validated = validateKit(kit);
  const doc = await KitModel.create({
    ownerId,
    requestHash,
    ...validated,
    generationMeta: meta,
  });
  return doc as unknown as KitDoc;
}

export async function getKitOwnedAsJson(ownerId: string, kitId: string) {
  const doc = await findKitOwned(ownerId, kitId);
  return { kit: toKit(doc), meta: (doc as unknown as { generationMeta?: unknown }).generationMeta, id: doc._id };
}

export async function applyKitMutation(
  ownerId: string,
  kitId: string,
  mutate: (kit: Kit) => Kit,
): Promise<Kit> {
  const doc = await findKitOwned(ownerId, kitId);
  const current = toKit(doc);
  const mutated = mutate(current);
  const validated = validateKit(mutated); // never persist an invalid kit
  doc.set({
    source: validated.source,
    company_brief: validated.company_brief,
    role: validated.role,
    questions: validated.questions,
    flashcards: validated.flashcards,
    schedule: validated.schedule,
    coverage: validated.coverage,
  });
  await doc.save();
  return validated;
}

export async function deleteKitOwned(ownerId: string, kitId: string): Promise<void> {
  const doc = await findKitOwned(ownerId, kitId);
  await doc.deleteOne();
}
