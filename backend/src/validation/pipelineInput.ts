import { z } from "zod";

export const PipelineInputSchema = z.object({
  jd: z
    .string({ required_error: "jd is required" })
    .trim()
    .min(1, "jd must be a non-empty string")
    .max(20000, "jd must be at most 20000 characters"),
  company_url: z
    .string({ required_error: "company_url is required" })
    .trim()
    .min(1, "company_url must be a non-empty string")
    .url("company_url must be a valid URL"),
  days: z.coerce
    .number({ required_error: "days is required" })
    .int("days must be an integer")
    .min(1, "days must be at least 1")
    .max(60, "days must be at most 60"),
});

export type PipelineInput = z.infer<typeof PipelineInputSchema>;

export const BatchCaseSchema = PipelineInputSchema.extend({
  id: z.string().trim().min(1, "case id is required"),
});
export type BatchCase = z.infer<typeof BatchCaseSchema>;

export const BatchCasesFileSchema = z.array(BatchCaseSchema).min(1, "batch file must contain at least one case");
