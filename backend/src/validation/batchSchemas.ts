import { z } from "zod";
import { PipelineInputSchema } from "./pipelineInput.js";

export const BatchWebCaseSchema = PipelineInputSchema.extend({
  id: z.string().trim().min(1).optional(),
});

export const BatchUploadSchema = z.object({
  cases: z.array(BatchWebCaseSchema).min(1, "at least one case is required").max(25, "at most 25 cases per batch"),
});
