/**
 * Card-selection scoring. Plain integer arithmetic, no LLM, no wages, no ZIP,
 * income or demographics. Ranks count from 0 (strongest first); a rank's
 * weight is 3 for the first, 2 for the second, 1 for the third.
 *
 * Total = interest + values + title.
 * - interest: for each RIASEC letter in both the student's interest_tags and
 *   the career's riasec_code, student weight × career weight (max 14).
 * - values: for each student work value, student weight × career points.
 *   Career points for an O*NET value are its weight by position in the
 *   career's work_values.high_points (0 if absent or not rated). Curiosity
 *   uses curiosityPoints below. Max 14.
 * - title: TITLE_BONUS when the student's Q1 dream job names this career.
 */
import type { ExtractedFilters } from "@/lib/extract/schema";
import type { Occupation } from "@/lib/data/schemas";
import { EntryEducationSchema } from "@/lib/data/schemas";
import { DREAM_JOB_ALIASES } from "./dream-jobs";

/** Highest possible interest + values score (14 + 14). */
export const MAX_FIT_SCORE = 28;
/** Bigger than MAX_FIT_SCORE, so a career the student names always ranks first among those eligible. */
export const TITLE_BONUS = MAX_FIT_SCORE + 1;
/** Slot 2 only: added to Registered Apprenticeship careers when the student asked about paid training (Q10). */
export const APPRENTICESHIP_BONUS = 2;

type Interest = ExtractedFilters["interest_tags"][number];
type WorkValue = ExtractedFilters["work_values"][number];
type EntryEducation = Occupation["education_and_training"]["entry_education"];

/** 3, 2, 1 for ranks 0, 1, 2; 0 for anything else (including -1, absent). */
export const rankWeight = (rank: number): number => (rank >= 0 && rank < 3 ? 3 - rank : 0);

export function interestPoints(tags: readonly Interest[], riasec: string): number {
  return tags.reduce((sum, tag, i) => sum + rankWeight(i) * rankWeight(riasec.indexOf(tag)), 0);
}

/**
 * Curiosity = O*NET Investigative interest position (3/2/1 by position in
 * riasec_code); decided by Sophie 2026-11-22, recorded in CLAUDE.md (Open
 * Questions, decided items). 3 if "I" is the first letter of riasec_code, 2 if
 * second, 1 if third, 0 if absent. occupations.json keeps work_values.curiosity as null; this rule is
 * the only place Curiosity gets a career score.
 */
export function curiosityPoints(riasec: string): number {
  return rankWeight(riasec.indexOf("I"));
}

export interface ValueItem {
  value: WorkValue;
  student_weight: number;
  career_points: number;
  points: number;
}

export function valueItems(values: readonly WorkValue[], occ: Occupation): ValueItem[] {
  return values.map((value, i) => {
    const career_points =
      value === "curiosity"
        ? curiosityPoints(occ.work_profile.riasec_code)
        : rankWeight(occ.work_values?.high_points.indexOf(value) ?? -1);
    const student_weight = rankWeight(i);
    return { value, student_weight, career_points, points: student_weight * career_points };
  });
}

const words = (s: string) => ` ${s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim()} `;

export type TitleMatch = "title" | "alias" | null;

/** True when `text` appears in the dream job as whole words, ignoring case and parentheses. */
function contains(dreamJob: string, text: string): boolean {
  const w = words(text);
  return w.trim() !== "" && words(dreamJob).includes(w);
}

/** True when the dream job contains one of the career's own titles (singular forms included). */
export function matchesOwnTitle(dreamJob: string, occ: Occupation): boolean {
  // Career and BLS titles are plural ("Registered Nurses"); students type the singular.
  const singular = (t: string) => t.replace(/s$/i, "");
  const titles = [occ.career_title, occ.bls_title].flatMap((t) => [t, singular(t)]);
  return [...titles, ...occ.lay_job_titles].some((t) => contains(dreamJob, t));
}

/**
 * How the dream job matched each career, decided across the whole roster so
 * a title always beats an alias:
 * 1. If any career's own title matches, those careers are "title" and the
 *    alias table is not used at all ("Nurse Practitioner" never also gives
 *    the "nurse" alias to Registered Nurses).
 * 2. Otherwise the longest DREAM_JOB_ALIASES key found in the dream job wins
 *    (ties: alphabetical), and only its careers are "alias".
 * Careers not in the map did not match.
 */
export function dreamJobMatches(
  dreamJob: string | null,
  occupations: readonly Occupation[],
  aliases: Record<string, readonly string[]> = DREAM_JOB_ALIASES,
): Map<string, Exclude<TitleMatch, null>> {
  const out = new Map<string, Exclude<TitleMatch, null>>();
  if (!dreamJob) return out;
  for (const occ of occupations) if (matchesOwnTitle(dreamJob, occ)) out.set(occ.soc_code, "title");
  if (out.size) return out;
  const key = Object.keys(aliases)
    .filter((k) => contains(dreamJob, k))
    .sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
  for (const soc of key ? aliases[key] : []) out.set(soc, "alias");
  return out;
}

const EDUCATION_ORDER = EntryEducationSchema.options;
export const educationRank = (e: EntryEducation): number => EDUCATION_ORDER.indexOf(e);

/** Hard filters. A null ceiling means no limit. */
export function withinCeilings(
  occ: Occupation,
  maxEducation: EntryEducation | null,
  jobZoneCeiling: number | null,
): boolean {
  const { entry_education, job_zone } = occ.education_and_training;
  return (
    (maxEducation === null || educationRank(entry_education) <= educationRank(maxEducation)) &&
    (jobZoneCeiling === null || job_zone <= jobZoneCeiling)
  );
}

/** Slot 2: an apprenticeship or a path of two years or less. */
export function isApprenticeshipOrTwoYear(occ: Occupation): boolean {
  const { training_pathway, bls_ojt_category } = occ.education_and_training;
  return (
    training_pathway === "Registered Apprenticeship" ||
    training_pathway === "Postsecondary Certificate / License" ||
    training_pathway === "2-Year Associate Degree" ||
    bls_ojt_category === "Apprenticeship" ||
    bls_ojt_category === "Long-term on-the-job training"
  );
}

export const isRegisteredApprenticeship = (occ: Occupation): boolean =>
  occ.education_and_training.training_pathway === "Registered Apprenticeship";

/** SOC major group ("29" for 29-1141), used as "field" for Adjacent Discovery. */
export const majorGroup = (soc: string): string => soc.slice(0, 2);
