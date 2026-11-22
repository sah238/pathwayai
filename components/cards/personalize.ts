/**
 * Turns one /api/recommend card into what the career card shows on top of the
 * dataset view: the selection label, "Why it fits you" and Claude's summary.
 * Pure and client-safe; it picks wording, it never computes a figure.
 *
 * Student-facing wording here (SLOT_LABELS, FIT_*, AVOID_*): DRAFT wording, pending
 * counselor review, like lib/match/selectCards.ts and app/results/first-steps.ts.
 */
import type { CardSummary, RecommendedCard, Slot } from "@/app/api/recommend/types";
import { RIASEC_LABELS } from "@/components/browse/logic";
import { Q9 } from "@/components/quiz/questions";
import { Q4_OPTIONS } from "@/lib/data/constants";

export const PERSONALIZE_WORDING_REVIEW_STATUS = "Draft — pending counselor review";

/** Short label above each card's title, by selection slot. Draft — pending counselor review. */
export const SLOT_LABELS: Record<Slot, string> = {
  direct: "Matches your interests",
  two_year: "Apprenticeship or two-year path",
  adjacent: "A career you might not have considered",
  real_path: "The real path to your dream job",
  closest_match: "Closest match to what you described",
  short_training: "A shorter training path",
};

export const FIT_VALUES_INTRO = "You said these matter to you:";
export const FIT_INTERESTS_INTRO = "It also lines up with your interests:";

/** Avoid-list warning. Draft — pending counselor review. */
export const AVOID_INTRO = "You said you'd rather avoid:";
export const AVOID_INVOLVES_ONE = "This career can involve it.";
export const AVOID_INVOLVES_MANY = "This career can involve them.";
export const AVOID_REASON_NAMED_JOB = "It's here because it's the job you named.";
export const AVOID_REASON_CLOSEST = "It's here because it's the closest match to what you described.";
export const AVOID_REASON_RELAXED = "It's here because we didn't find enough other careers that fit your answers.";

const AVOID_CHIP_LABELS: ReadonlyMap<string, string> = new Map(
  Q9.categories.flatMap((c) => c.chips.map((chip) => [chip.flag, chip.label] as const)),
);

export interface AvoidWarning {
  /** Q9 chip wording for each flag this career hits. */
  labels: string[];
  involves: string;
  reason: string;
}

export interface CardLabel {
  kicker: string;
  /** From selection's dream_job_label: shown when the card is the closest career to the student's named job. */
  heading: string | null;
  note: string | null;
}

export interface FitView {
  /** Q4 card wording for each matched value, strongest first. */
  values: string[];
  interests: string[];
}

export interface CardExtras {
  label: CardLabel;
  /** null when nothing matched: the card keeps "What this job rewards". */
  fit: FitView | null;
  /** Claude's checked summary, or null to show the task list. */
  summary: Extract<CardSummary, { kind: "summary" }> | null;
  /** Why a career the student said they'd avoid is still shown; null when it hits nothing. */
  avoid: AvoidWarning | null;
}

export function avoidWarning(card: Pick<RecommendedCard, "slot" | "avoid_hits">): AvoidWarning | null {
  const labels = card.avoid_hits.flatMap((f) => AVOID_CHIP_LABELS.get(f) ?? []);
  if (labels.length === 0) return null;
  return {
    labels,
    involves: labels.length === 1 ? AVOID_INVOLVES_ONE : AVOID_INVOLVES_MANY,
    reason:
      card.slot === "real_path"
        ? AVOID_REASON_NAMED_JOB
        : card.slot === "closest_match"
          ? AVOID_REASON_CLOSEST
          : AVOID_REASON_RELAXED,
  };
}

export function cardLabel(card: Pick<RecommendedCard, "slot" | "dream_job_label">): CardLabel {
  return {
    kicker: SLOT_LABELS[card.slot],
    heading: card.dream_job_label?.heading ?? null,
    note: card.dream_job_label?.note ?? null,
  };
}

export function fitView(card: Pick<RecommendedCard, "matched_values" | "matched_interests">): FitView | null {
  const values = card.matched_values
    .map((v) => Q4_OPTIONS.find((o) => o.value === v)?.label)
    .filter((l): l is NonNullable<typeof l> => !!l);
  const interests = card.matched_interests.map((t) => RIASEC_LABELS[t]);
  return values.length || interests.length ? { values, interests } : null;
}

export function cardExtras(card: RecommendedCard): CardExtras {
  return {
    label: cardLabel(card),
    fit: fitView(card),
    summary: card.summary.kind === "summary" ? card.summary : null,
    avoid: avoidWarning(card),
  };
}
