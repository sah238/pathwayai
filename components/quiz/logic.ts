/**
 * Quiz state and rules, with no React, so they can be unit-tested.
 * Answers live only in this in-memory state: nothing here touches storage,
 * cookies or the network.
 */
import type { Q4Label } from "@/lib/data/constants";
import { zipToState } from "@/lib/data/geo";
import { QuizResponsesSchema, type QuizResponses } from "@/lib/quiz/responses";
import {
  FOLLOW_UPS,
  NO_PREFERENCE,
  Q10,
  Q11,
  Q2,
  Q4,
  Q5,
  Q6,
  Q8,
  Q9,
  type Q2Label,
  type Q5Key,
  type Q6Key,
  type Q9CategoryId,
  type SliderStop,
} from "./questions";

export type FollowUpId = keyof typeof FOLLOW_UPS;
/** Priority order from docs/values-quiz.md, Follow-ups. */
export const FOLLOW_UP_ORDER: readonly FollowUpId[] = ["q1_reason", "q4_values", "q10_training", "q2_pick"];
export const MAX_FOLLOW_UPS = 2;

export type QuizOrder = {
  q2: Q2Label[];
  q4: Q4Label[];
  /** Shuffled, with "No preference" last. */
  q8: string[];
  q9: Record<Q9CategoryId, string[]>;
};

export type QuizState = {
  order: QuizOrder;
  q1: { mode: "job" | "workday"; job: string; because: string; workday: string };
  q2: Q2Label[];
  q3: string;
  /** Q4 is answered only once all 3 picks are made; otherwise it counts as skipped. */
  q4: { most: Q4Label[]; least: Q4Label | null };
  q5: Record<Q5Key, string | null>;
  q6: Record<Q6Key, SliderStop>;
  q7: string | null;
  q8: { regularity: string | null; weekly_hours: string | null };
  q9: {
    none: boolean;
    categories: Q9CategoryId[];
    chips: string[];
    somethingElseChecked: boolean;
    somethingElse: string;
  };
  q10: { choice: string | null; apprenticeship: boolean };
  q11: string;
  followUps: {
    q1_reason: { choice: string | null; other: string };
    q4_values: string | null;
    q10_training: string | null;
    q2_pick: Q2Label | null;
  };
};

/** Fisher–Yates on a copy. `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function makeOrder(random: () => number = Math.random): QuizOrder {
  const q9 = Object.fromEntries(
    Q9.categories.map((c) => [c.id, shuffle(c.chips.map((chip) => chip.label), random)]),
  ) as Record<Q9CategoryId, string[]>;
  return {
    q2: shuffle(Q2.options.map((o) => o.label), random),
    q4: shuffle(Q4.labels, random),
    q8: [...shuffle(Q8.regularity, random), NO_PREFERENCE],
    q9,
  };
}

export function initialState(order: QuizOrder): QuizState {
  return {
    order,
    q1: { mode: "job", job: "", because: "", workday: "" },
    q2: [],
    q3: "",
    q4: { most: [], least: null },
    q5: { support_vs_independence: null, recognition_vs_relationships: null, working_conditions_vs_achievement: null },
    q6: { indoors_outdoors: 1, desk_moving: 1 },
    q7: null,
    q8: { regularity: null, weekly_hours: null },
    q9: { none: false, categories: [], chips: [], somethingElseChecked: false, somethingElse: "" },
    q10: { choice: null, apprenticeship: false },
    q11: "",
    followUps: {
      q1_reason: { choice: null, other: "" },
      q4_values: null,
      q10_training: null,
      q2_pick: null,
    },
  };
}

const trimOrNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

const VAGUE_REASON =
  /^(because\s+)?(it'?s\s+|it\s+is\s+|they'?re\s+|seems\s+)?(so\s+|really\s+|very\s+)?(cool|fun|nice|good|great|interesting|awesome|neat|fine|ok|okay|idk|i\s+don'?t\s+know|not\s+sure|i\s+like\s+it|i\s+just\s+do)[.!]*$/i;

/**
 * True when the Q1 "because" is too vague to read values from: empty, under
 * 4 words, or a stock phrase like "because it's cool". A fixed rule, no AI.
 */
export function isVagueReason(because: string): boolean {
  const t = because.trim();
  if (t === "") return true;
  if (VAGUE_REASON.test(t)) return true;
  const words = t.replace(/^because\s+/i, "").split(/\s+/).filter(Boolean);
  return words.length < 4;
}

export const q4Complete = (q4: QuizState["q4"]): boolean => q4.most.length === 2 && q4.least !== null;

/** Tap-to-sort: first 2 taps are "most", the next is "least"; tapping a picked card unpicks it. */
export function tapQ4(q4: QuizState["q4"], label: Q4Label): QuizState["q4"] {
  if (q4.most.includes(label)) return { ...q4, most: q4.most.filter((l) => l !== label) };
  if (q4.least === label) return { ...q4, least: null };
  if (q4.most.length < 2) return { ...q4, most: [...q4.most, label] };
  if (q4.least === null) return { ...q4, least: label };
  return q4;
}

/** Which follow-ups this student sees, in priority order, capped at 2. */
export function followUpsFor(s: QuizState): FollowUpId[] {
  const triggered: Record<FollowUpId, boolean> = {
    q1_reason: s.q1.mode === "job" && isVagueReason(s.q1.because),
    q4_values:
      !q4Complete(s.q4) || Q5.pairs.every((p) => s.q5[p.key] === NO_PREFERENCE),
    q10_training: s.q10.choice === Q10.notSure,
    q2_pick: s.q2.length === 0,
  };
  return FOLLOW_UP_ORDER.filter((id) => triggered[id]).slice(0, MAX_FOLLOW_UPS);
}

/** Q9 chips the student actually picked, in the doc's order, only under checked categories. */
function q9Picked(s: QuizState) {
  if (s.q9.none) return [];
  return Q9.categories
    .filter((c) => s.q9.categories.includes(c.id))
    .flatMap((c) => c.chips.filter((chip) => s.q9.chips.includes(chip.label)));
}

export const isValidZip = (zip: string): boolean => /^\d{5}$/.test(zip.trim());

/**
 * The note shown under Q11 for a complete ZIP outside DC, MD and VA, or null.
 * It never blocks Next: the ZIP is still kept, and the results page falls
 * back to national wages.
 */
export function zipRegionMessage(zip: string): string | null {
  return isValidZip(zip) && zipToState(zip) === null ? Q11.outsideRegion : null;
}

/** Question steps are 0–10 (Q1–Q11); follow-up steps come after. */
export function canAdvance(s: QuizState, step: number): boolean {
  switch (step) {
    case 0:
      return s.q1.mode === "job" ? s.q1.job.trim() !== "" : s.q1.workday.trim() !== "";
    case 1:
    case 2:
      return true; // Q2 may be empty (follow-up); Q3 is optional
    case 3:
      return q4Complete(s.q4); // skipping uses its own button
    case 4:
      return Q5.pairs.every((p) => s.q5[p.key] !== null);
    case 5:
      return true; // sliders default to "No preference"
    case 6:
      return s.q7 !== null;
    case 7:
      return s.q8.regularity !== null && s.q8.weekly_hours !== null;
    case 8:
      return true;
    case 9:
      return s.q10.choice !== null;
    case 10:
      return s.q11.trim() === "" || isValidZip(s.q11);
    default:
      return true; // follow-ups are optional
  }
}

const sliderValue = (key: Q6Key, stop: SliderStop): string => {
  const slider = Q6.sliders.find((sl) => sl.key === key)!;
  return stop === 0 ? slider.left : stop === 2 ? slider.right : NO_PREFERENCE;
};

/**
 * Build the QuizResponses object from the in-memory state. Follow-up answers
 * land only where the schema has a field (Q2 pick, Q10 follow-up); the Q1
 * and Q4/Q5 follow-ups are shown but not stored.
 */
export function buildQuizResponses(s: QuizState): QuizResponses {
  const shown = followUpsFor(s);
  const picked = q9Picked(s);
  const q2Pick = shown.includes("q2_pick") ? s.followUps.q2_pick : null;

  const draft = {
    q1_dream_job:
      s.q1.mode === "job"
        ? { has_dream_job: true, job: s.q1.job.trim(), because: trimOrNull(s.q1.because), workday_description: null }
        : { has_dream_job: false, job: null, because: null, workday_description: s.q1.workday.trim() },
    q2_activities: s.q2.length > 0 ? [...s.q2] : q2Pick ? [q2Pick] : [],
    q3_asked_for_help: trimOrNull(s.q3),
    q4_values_most_least: q4Complete(s.q4)
      ? { most_important: [s.q4.most[0], s.q4.most[1]], least_important: s.q4.least }
      : null,
    q5_job_pairs: {
      support_vs_independence: s.q5.support_vs_independence,
      recognition_vs_relationships: s.q5.recognition_vs_relationships,
      working_conditions_vs_achievement: s.q5.working_conditions_vs_achievement,
    },
    q6_work_setting: {
      indoors_outdoors: sliderValue("indoors_outdoors", s.q6.indoors_outdoors),
      desk_moving: sliderValue("desk_moving", s.q6.desk_moving),
    },
    q7_working_with_public: s.q7,
    q8_schedule: { regularity: s.q8.regularity, weekly_hours: s.q8.weekly_hours },
    q9_avoid: {
      selected_flags: picked.map((c) => c.flag),
      selected_chips: picked.map((c) => c.label),
      something_else: !s.q9.none && s.q9.somethingElseChecked ? trimOrNull(s.q9.somethingElse) : null,
    },
    q10_training: {
      max_education: s.q10.choice,
      apprenticeship_interest: s.q10.apprenticeship,
      follow_up: shown.includes("q10_training") ? s.followUps.q10_training : null,
    },
    q11_zip_code: isValidZip(s.q11) ? s.q11.trim() : null,
  };

  // Parse so a bad state fails loudly here rather than downstream.
  return QuizResponsesSchema.parse(draft);
}
