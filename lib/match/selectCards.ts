/**
 * Picks the three career cards from Stage 1 filters and the quiz, using only
 * readable integer scoring (./score.ts). No LLM, and the same input always
 * gives the same output: ties break by SOC code, ascending.
 *
 * Inputs are narrowed first (`MatchInput`): ZIP, income and every quiz answer
 * not listed there never reach selection (CLAUDE.md rules 5 and the anti-bias
 * rule). Work context is not scored (Beta stretch).
 *
 * Standard mode:
 *   1. direct   – best total among careers within the ceilings
 *   2. two_year – best apprenticeship or two-year path within the ceilings
 *   3. adjacent – shares a RIASEC letter, different SOC major group from 1 and 2
 * Conflict mode (has_constraint_conflict):
 *   1. real_path      – best total with the ceilings ignored. Called the real
 *        path only when the dream job matches the career's own title; an
 *        alias or score-only pick is closest_match, with dreamJobLabel text
 *   2–3. short_training – best careers needing at most a postsecondary
 *        nondegree award and Job Zone 3 (or the student's own ceiling, if higher)
 *
 * Q9 avoid flags (./avoid.ts, draft) remove careers from every slot except the
 * conflict real path, which keeps them and reports the hits. If removing them
 * leaves a slot empty, the slot falls back and says so.
 */
import type { ExtractedFilters } from "@/lib/extract/schema";
import type { Occupation } from "@/lib/data/schemas";
import type { QuizResponses } from "@/lib/quiz/responses";
import { avoidHits } from "./avoid";
import {
  APPRENTICESHIP_BONUS,
  TITLE_BONUS,
  educationRank,
  interestPoints,
  isApprenticeshipOrTwoYear,
  isRegisteredApprenticeship,
  majorGroup,
  dreamJobMatches,
  valueItems,
  withinCeilings,
  type TitleMatch,
  type ValueItem,
} from "./score";

/**
 * Student-facing wording in this file (NUDGE_MESSAGE and dreamJobLabel):
 * DRAFT wording, pending counselor review, like app/results/first-steps.ts.
 */
export const MATCH_WORDING_REVIEW_STATUS = "Draft — pending counselor review";

/** Shown instead of cards when Stage 1 says the input is not about careers. Draft — pending counselor review. */
export const NUDGE_MESSAGE =
  "PathwayAI helps you explore careers. Tell us about a job you've imagined, or describe a workday you'd enjoy, and we'll show you three careers to look at.";

/**
 * Conflict card 1 is "real_path" when the dream job matches a roster title,
 * and "closest_match" when it matched only through a draft alias (or not at
 * all): then it is not the student's job, so it must not be called the real path.
 */
export type Slot = "direct" | "two_year" | "adjacent" | "real_path" | "closest_match" | "short_training";

/**
 * Fixed wording shown on an alias-matched or closest_match card. `typed` is
 * the student's Q1 job, as entered. Draft — pending counselor review.
 */
export interface DreamJobLabel {
  heading: string;
  note: string;
}

export function dreamJobLabel(typed: string): DreamJobLabel {
  const job = typed.trim();
  return {
    heading: `Closest career in our list to ${job}`,
    note: `${job} isn't in our career data yet.`,
  };
}

export interface ScoreBreakdown {
  interest: number;
  values: ValueItem[];
  values_total: number;
  /** How the dream job matched this career: its own title, a draft alias, or not at all. */
  title_match: TitleMatch;
  title: number;
  /** Slot 2 only. */
  apprenticeship_bonus: number;
  total: number;
}

export interface Pick {
  soc: string;
  slot: Slot;
  breakdown: ScoreBreakdown;
  /** Q9 flags this career hits. Non-empty only on a conflict real path or after an avoid fallback. */
  avoid_hits: string[];
  /** Rules this slot had to relax to find a career, in the order tried. */
  fallbacks: string[];
  /** Set on any card matched through a dream-job alias, and on a closest_match card when the student named a job. */
  dream_job_label: DreamJobLabel | null;
}

export type SelectResult =
  | { kind: "nudge"; message: string }
  | { kind: "cards"; mode: "standard" | "conflict"; cards: [Pick, Pick, Pick] };

/** Everything selection may read. Nothing else from the filters or quiz. */
export interface MatchInput {
  is_career_query: boolean;
  has_constraint_conflict: boolean;
  interest_tags: ExtractedFilters["interest_tags"];
  work_values: ExtractedFilters["work_values"];
  max_education: ExtractedFilters["max_education"];
  job_zone_ceiling: ExtractedFilters["job_zone_ceiling"];
  dream_job: string | null;
  avoid_flags: string[];
  apprenticeship_interest: boolean;
}

export function toMatchInput(filters: ExtractedFilters, quiz: QuizResponses): MatchInput {
  return {
    is_career_query: filters.is_career_query,
    has_constraint_conflict: filters.has_constraint_conflict,
    interest_tags: filters.interest_tags,
    work_values: filters.work_values,
    max_education: filters.max_education,
    job_zone_ceiling: filters.job_zone_ceiling,
    dream_job: quiz.q1_dream_job.job,
    avoid_flags: quiz.q9_avoid.selected_flags,
    apprenticeship_interest: quiz.q10_training.apprenticeship_interest,
  };
}

export class SelectionError extends Error {}

export function selectCards(
  filters: ExtractedFilters,
  quiz: QuizResponses,
  occupations: Occupation[],
): SelectResult {
  return selectFromInput(toMatchInput(filters, quiz), occupations);
}

interface Scored {
  occ: Occupation;
  breakdown: ScoreBreakdown;
  hits: string[];
}

type DreamJobMatches = ReturnType<typeof dreamJobMatches>;

function score(input: MatchInput, occ: Occupation, matches: DreamJobMatches, slotBonus = 0): Scored {
  const interest = interestPoints(input.interest_tags, occ.work_profile.riasec_code);
  const values = valueItems(input.work_values, occ);
  const values_total = values.reduce((s, v) => s + v.points, 0);
  const title_match: TitleMatch = matches.get(occ.soc_code) ?? null;
  const title = title_match ? TITLE_BONUS : 0;
  return {
    occ,
    breakdown: {
      interest,
      values,
      values_total,
      title_match,
      title,
      apprenticeship_bonus: slotBonus,
      total: interest + values_total + title + slotBonus,
    },
    hits: avoidHits(occ.soc_code, input.avoid_flags),
  };
}

const byScore = (a: Scored, b: Scored) =>
  b.breakdown.total - a.breakdown.total || a.occ.soc_code.localeCompare(b.occ.soc_code);

interface Rule {
  /** Label recorded in `fallbacks` when this rule had to be dropped. */
  name: string;
  test: (s: Scored) => boolean;
}

/**
 * Best candidate that passes every rule. If none does, drop rules from the
 * end one at a time (recording each) until one passes. `base` is never
 * relaxed. Avoid filtering is always the first rule, so it is relaxed last.
 */
function best(
  candidates: Scored[],
  base: (s: Scored) => boolean,
  rules: Rule[],
  slot: Slot,
): Pick | null {
  const pool = candidates.filter(base).sort(byScore);
  const fallbacks: string[] = [];
  for (let n = rules.length; n >= 0; n--) {
    const active = rules.slice(0, n);
    const hit = pool.find((s) => active.every((r) => r.test(s)));
    if (hit) {
      return {
        soc: hit.occ.soc_code,
        slot,
        breakdown: hit.breakdown,
        avoid_hits: hit.hits,
        fallbacks,
        dream_job_label: null,
      };
    }
    if (n > 0) fallbacks.push(rules[n - 1].name);
  }
  return null;
}

const noAvoid: Rule = { name: "avoid flags relaxed", test: (s) => s.hits.length === 0 };

export function selectFromInput(input: MatchInput, occupations: Occupation[]): SelectResult {
  if (!input.is_career_query) return { kind: "nudge", message: NUDGE_MESSAGE };

  const matches = dreamJobMatches(input.dream_job, occupations);
  const scored = occupations.map((o) => score(input, o, matches));
  const taken = new Set<string>();
  const notTaken = (s: Scored) => !taken.has(s.occ.soc_code);
  const take = (p: Pick | null, what: string): Pick => {
    if (!p) throw new SelectionError(`No career left for the ${what} slot`);
    taken.add(p.soc);
    return p;
  };

  if (input.has_constraint_conflict) {
    const top = take(best(scored, notTaken, [], "real_path"), "real path");
    // Only a roster title match is the real path. An alias (or no match) is
    // just the closest career we have, and says so when the student named a job.
    const real: Pick = top.breakdown.title_match === "title" ? top : { ...top, slot: "closest_match" };

    // Short training: at most a postsecondary nondegree award and Job Zone 3,
    // or the student's own ceiling where it is higher (null = no limit).
    const SHORT = "Postsecondary nondegree award";
    const shortEd =
      input.max_education === null || educationRank(input.max_education) >= educationRank(SHORT)
        ? input.max_education
        : SHORT;
    const shortJz = input.job_zone_ceiling === null ? null : Math.max(input.job_zone_ceiling, 3);
    const short = (s: Scored) => notTaken(s) && withinCeilings(s.occ, shortEd, shortJz);

    const alt1 = take(best(scored, short, [noAvoid], "short_training"), "first short-training");
    const otherField: Rule = {
      name: "different field relaxed",
      test: (s) => ![real.soc, alt1.soc].map(majorGroup).includes(majorGroup(s.occ.soc_code)),
    };
    const alt2 = take(best(scored, short, [noAvoid, otherField], "short_training"), "second short-training");
    return { kind: "cards", mode: "conflict", cards: labeled(input, [real, alt1, alt2]) };
  }

  const eligible = (s: Scored) => notTaken(s) && withinCeilings(s.occ, input.max_education, input.job_zone_ceiling);

  const direct = take(best(scored, eligible, [noAvoid], "direct"), "direct");

  const twoYearScored = occupations.map((o) =>
    score(input, o, matches, input.apprenticeship_interest && isRegisteredApprenticeship(o) ? APPRENTICESHIP_BONUS : 0),
  );
  const twoYear = take(
    best(twoYearScored, (s) => eligible(s) && isApprenticeshipOrTwoYear(s.occ), [noAvoid], "two_year"),
    "apprenticeship or two-year",
  );

  const sharesInterest: Rule = { name: "shared interest relaxed", test: (s) => s.breakdown.interest > 0 };
  const notDirectField: Rule = {
    name: "different field from card 1 relaxed",
    test: (s) => majorGroup(s.occ.soc_code) !== majorGroup(direct.soc),
  };
  const notTwoYearField: Rule = {
    name: "different field from card 2 relaxed",
    test: (s) => majorGroup(s.occ.soc_code) !== majorGroup(twoYear.soc),
  };
  const adjacent = take(
    best(scored, eligible, [noAvoid, sharesInterest, notDirectField, notTwoYearField], "adjacent"),
    "adjacent",
  );

  return { kind: "cards", mode: "standard", cards: labeled(input, [direct, twoYear, adjacent]) };
}

/**
 * Adds the closest-match label to every card the dream job reached only
 * through a draft alias, and to a closest_match card when the student named a
 * job. Title matches (including singular forms) stay unlabeled.
 */
function labeled(input: MatchInput, cards: [Pick, Pick, Pick]): [Pick, Pick, Pick] {
  const needsLabel = (c: Pick) => c.breakdown.title_match === "alias" || c.slot === "closest_match";
  return cards.map((c) =>
    input.dream_job && needsLabel(c) ? { ...c, dream_job_label: dreamJobLabel(input.dream_job) } : c,
  ) as [Pick, Pick, Pick];
}
