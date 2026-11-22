/**
 * Q10 ("How much more school or training after high school are you open to?")
 * mapped to the education ceiling and Job Zone ceiling used in matching.
 *
 * Code sets these, never Claude (CLAUDE.md rule 1). Keys are the Q10 options
 * exactly as stored in QuizResponses (note the ASCII hyphen in "About 1-2 years").
 * Both values are ceilings: a student who picks "About 4 years" can still be
 * matched to shorter paths.
 *
 * Reviewed with the team on 2026-11-22:
 * - "Start working right away" allows Job Zone 3 so that apprenticeships that
 *   need only a high school diploma (for example electricians) stay visible;
 *   the education ceiling still screens out associate's-degree roles.
 * - "Not sure yet", and any value not listed here, sets no ceiling (null).
 */
import type { z } from "zod";
import type { EntryEducationSchema } from "@/lib/data/schemas";

export type EntryEducation = z.infer<typeof EntryEducationSchema>;

export interface TrainingCeiling {
  max_education: EntryEducation | null;
  job_zone_ceiling: 1 | 2 | 3 | 4 | 5 | null;
}

export const Q10_TRAINING_TABLE = {
  "Start working right away": {
    max_education: "High school diploma or equivalent",
    job_zone_ceiling: 3,
  },
  "A few months": { max_education: "Postsecondary nondegree award", job_zone_ceiling: 3 },
  "About 1-2 years": { max_education: "Associate's degree", job_zone_ceiling: 3 },
  "About 4 years": { max_education: "Bachelor's degree", job_zone_ceiling: 4 },
  "More than 4 years": { max_education: "Doctoral or professional degree", job_zone_ceiling: 5 },
  "Not sure yet": { max_education: null, job_zone_ceiling: null },
} as const satisfies Record<string, TrainingCeiling>;

const NO_CEILING: TrainingCeiling = { max_education: null, job_zone_ceiling: null };

/** Looks up a stored Q10 answer; unknown answers set no ceiling. */
export function trainingCeiling(q10MaxEducation: string): TrainingCeiling {
  return Object.hasOwn(Q10_TRAINING_TABLE, q10MaxEducation)
    ? Q10_TRAINING_TABLE[q10MaxEducation as keyof typeof Q10_TRAINING_TABLE]
    : NO_CEILING;
}
