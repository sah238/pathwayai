/**
 * Stage 1 output: the structured filters Claude extracts from a student's quiz
 * answers, plus the ceilings code sets from Q10.
 *
 * Every list is closed. Values come from lib/data so the filters line up with
 * the dataset; anything outside them fails validation and the request errors.
 */
import { z } from "zod";
import { ONET_WORK_VALUES, type Q4Value } from "@/lib/data/constants";
import {
  EntryEducationSchema,
  HoursScheduleLabelSchema,
  WorkEnvironmentLabelSchema,
} from "@/lib/data/schemas";

/** Holland (RIASEC) interest codes, the letters used in `riasec_code`. */
export const RIASEC_CODES = ["R", "I", "A", "S", "E", "C"] as const;
export const InterestTagSchema = z.enum(RIASEC_CODES);

/** The six O*NET Work Values plus Curiosity (no dataset score yet). */
const WORK_VALUES = [...ONET_WORK_VALUES, "curiosity"] as const satisfies readonly Q4Value[];
export const WorkValueSchema = z.enum(WORK_VALUES);

export const WorkContextSchema = z.enum([
  ...WorkEnvironmentLabelSchema.options,
  ...HoursScheduleLabelSchema.options,
]);

/** What Claude returns. Sent to the API as the structured-output JSON schema. */
export const ModelOutputSchema = z.strictObject({
  is_career_query: z.boolean(),
  has_constraint_conflict: z.boolean(),
  interest_tags: z.array(InterestTagSchema),
  work_values: z.array(WorkValueSchema),
  work_context: z.array(WorkContextSchema),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

/** What /api/extract returns. */
export const ExtractedFiltersSchema = ModelOutputSchema.extend({
  max_education: EntryEducationSchema.nullable(),
  job_zone_ceiling: z.number().int().min(1).max(5).nullable(),
  /** Copied from the request on the server; never sent to Claude. */
  zip_code: z.string().regex(/^\d{5}$/).nullable(),
});
export type ExtractedFilters = z.infer<typeof ExtractedFiltersSchema>;
