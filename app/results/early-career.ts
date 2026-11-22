/**
 * Early-career caution flag (CLAUDE.md → AI Impact Signals, item 2).
 *
 * Written rule: show the flag when the BLS AI exposure tier is High or Very
 * high AND typical entry education is a bachelor's degree or higher. The card
 * reads this table; it never applies the rule on its own or asks a model.
 * Every cell is spelled out so reviewers can check it line by line.
 */
import type { z } from "zod";
import type { Source } from "@/lib/data/provenance";
import type { AiExposureTierSchema, EntryEducationSchema } from "@/lib/data/schemas";

export type AiExposureTier = z.infer<typeof AiExposureTierSchema>;
export type EntryEducation = z.infer<typeof EntryEducationSchema>;

export const EARLY_CAREER_REVIEW_STATUS = "Draft — pending team review";

/** entry_education → ai_exposure_tier → show the flag? */
export const EARLY_CAREER_TABLE: Record<EntryEducation, Record<AiExposureTier, boolean>> = {
  "No formal educational credential": { Low: false, Moderate: false, High: false, "Very high": false },
  "High school diploma or equivalent": { Low: false, Moderate: false, High: false, "Very high": false },
  "Postsecondary nondegree award": { Low: false, Moderate: false, High: false, "Very high": false },
  "Associate's degree": { Low: false, Moderate: false, High: false, "Very high": false },
  "Bachelor's degree": { Low: false, Moderate: false, High: true, "Very high": true },
  "Master's degree": { Low: false, Moderate: false, High: true, "Very high": true },
  "Doctoral or professional degree": { Low: false, Moderate: false, High: true, "Very high": true },
};

export const EARLY_CAREER_SOURCE: Source = {
  source: "Stanford Digital Economy Lab, “Canaries in the Coal Mine?”",
  data_vintage: "Revised August 12, 2026",
  source_url: "https://digitaleconomy.stanford.edu/publications/canaries-in-the-coal-mine/",
};

export const EARLY_CAREER_BADGE = "Early-career caution";
export const EARLY_CAREER_TEXT =
  "Research has found fewer young workers being hired in jobs like this in recent years. These findings are early and describe what has happened so far; they are not a prediction about you.";

export interface EarlyCareerFlag {
  badge: typeof EARLY_CAREER_BADGE;
  text: typeof EARLY_CAREER_TEXT;
  /** Why it shows, from the two looked-up values. */
  reason: string;
  source: Source;
  review_status: typeof EARLY_CAREER_REVIEW_STATUS;
}

export function earlyCareerFlag(education: EntryEducation, tier: AiExposureTier): EarlyCareerFlag | null {
  if (!EARLY_CAREER_TABLE[education][tier]) return null;
  return {
    badge: EARLY_CAREER_BADGE,
    text: EARLY_CAREER_TEXT,
    reason: `Shown because BLS rates this job's AI exposure as ${tier} and it usually starts with a ${education.toLowerCase()}.`,
    source: EARLY_CAREER_SOURCE,
    review_status: EARLY_CAREER_REVIEW_STATUS,
  };
}
