import { describe, expect, it } from "vitest";
import { Q4_OPTIONS } from "@/lib/data/constants";
import { QuizResponsesSchema } from "@/lib/quiz/responses";
import {
  buildQuizResponses,
  canAdvance,
  followUpsFor,
  initialState,
  isVagueReason,
  makeOrder,
  shuffle,
  tapQ4,
  type QuizState,
} from "./logic";
import { NO_PREFERENCE, Q2, Q8, Q9 } from "./questions";

/** Deterministic random so shuffles are repeatable. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const labels = Q4_OPTIONS.map((o) => o.label);

/** Simulates a student tapping through all 11 screens, like the UI does. */
function simulateRun(edit: (s: QuizState) => void = () => {}): QuizState {
  const s = initialState(makeOrder(seeded(7)));
  s.q1 = { mode: "job", job: "Nurse", because: "because I want to help people feel better", workday: "" };
  s.q2 = [s.order.q2[0], s.order.q2[1]];
  s.q3 = "Friends ask me to help with homework.";
  s.q4 = [labels[3], labels[5], labels[2]].reduce(tapQ4, s.q4);
  s.q5 = {
    support_vs_independence: "Your manager gives you a clear plan to follow",
    recognition_vs_relationships: "Your team shares the credit and everyone backs each other up",
    working_conditions_vs_achievement: NO_PREFERENCE,
  };
  s.q6 = { indoors_outdoors: 0, desk_moving: 2 };
  s.q7 = "Most of it";
  s.q8 = { regularity: s.order.q8[0], weekly_hours: "Usually 40 or less" };
  s.q9 = {
    none: false,
    categories: ["surroundings", "schedule"],
    chips: ["Loud noise", "Night shifts"],
    somethingElseChecked: false,
    somethingElse: "",
  };
  s.q10 = { choice: "About 1-2 years", apprenticeship: true };
  s.q11 = "20019";
  edit(s);
  return s;
}

describe("quiz output", () => {
  it("builds a QuizResponses object that validates against the schema", () => {
    const s = simulateRun();
    for (let step = 0; step <= 10; step++) expect(canAdvance(s, step), `step ${step}`).toBe(true);
    const out = buildQuizResponses(s);
    expect(QuizResponsesSchema.safeParse(out).error?.issues).toBeUndefined();
    expect(out.q4_values_most_least).toEqual({
      most_important: [labels[3], labels[5]],
      least_important: labels[2],
    });
    expect(out.q6_work_setting).toEqual({ indoors_outdoors: "Indoors", desk_moving: "On my feet and moving" });
    expect(out.q9_avoid).toEqual({
      selected_flags: ["noise", "night_shifts"],
      selected_chips: ["Loud noise", "Night shifts"],
      something_else: null,
    });
    expect(out.q10_training).toEqual({ max_education: "About 1-2 years", apprenticeship_interest: true, follow_up: null });
    expect(followUpsFor(s)).toEqual([]);
  });

  it("handles 'I don't have one yet', skips and follow-ups", () => {
    const s = simulateRun((s) => {
      s.q1 = { mode: "workday", job: "Typed then abandoned", because: "", workday: "Outside all day fixing things." };
      s.q2 = [];
      s.q3 = "   ";
      s.q4 = { most: [labels[0]], least: null }; // partial, then skipped
      s.q9.none = true;
      s.q10 = { choice: "Not sure yet", apprenticeship: false };
      s.q11 = "";
      s.followUps.q4_values = "What you do every day";
      s.followUps.q10_training = "Start earning sooner";
      s.followUps.q2_pick = "Cook for people";
    });
    // Q4 skipped beats Q10 and Q2 for the two slots.
    expect(followUpsFor(s)).toEqual(["q4_values", "q10_training"]);
    const out = QuizResponsesSchema.parse(buildQuizResponses(s));
    expect(out.q1_dream_job).toEqual({
      has_dream_job: false,
      job: null,
      because: null,
      workday_description: "Outside all day fixing things.",
    });
    expect(out.q2_activities).toEqual([]); // Q2 follow-up was not shown, so its pick is ignored
    expect(out.q3_asked_for_help).toBeNull();
    expect(out.q4_values_most_least).toBeNull();
    expect(out.q9_avoid).toEqual({ selected_flags: [], selected_chips: [], something_else: null });
    expect(out.q10_training.follow_up).toBe("Start earning sooner");
    expect(out.q11_zip_code).toBeNull();
  });

  it("uses the Q2 follow-up pick when nothing else outranks it", () => {
    const s = simulateRun((s) => {
      s.q2 = [];
      s.followUps.q2_pick = "Take care of an animal or a garden";
    });
    expect(followUpsFor(s)).toEqual(["q2_pick"]);
    expect(buildQuizResponses(s).q2_activities).toEqual(["Take care of an animal or a garden"]);
  });

  it("caps follow-ups at 2, in the doc's order", () => {
    const s = simulateRun((s) => {
      s.q1.because = "it's cool";
      s.q5 = {
        support_vs_independence: NO_PREFERENCE,
        recognition_vs_relationships: NO_PREFERENCE,
        working_conditions_vs_achievement: NO_PREFERENCE,
      };
      s.q10.choice = "Not sure yet";
      s.q2 = [];
    });
    expect(followUpsFor(s)).toEqual(["q1_reason", "q4_values"]);
    // Q1 and Q4/Q5 follow-up answers are not stored in QuizResponses.
    expect(QuizResponsesSchema.safeParse(buildQuizResponses(s)).success).toBe(true);
  });

  it("keeps only chips under checked categories, plus Something else text", () => {
    const s = simulateRun((s) => {
      s.q9 = {
        none: false,
        categories: ["physical", "people"], // "Loud noise" stays picked but Surroundings is unchecked
        chips: ["Selling things or meeting sales goals", "Loud noise", "Heavy lifting"],
        somethingElseChecked: true,
        somethingElse: "  Talking on the phone all day. ",
      };
    });
    expect(buildQuizResponses(s).q9_avoid).toEqual({
      selected_flags: ["heavy_lifting", "sales"],
      selected_chips: ["Heavy lifting", "Selling things or meeting sales goals"],
      something_else: "Talking on the phone all day.",
    });
  });

  it("blocks Next until required answers are in", () => {
    const s = initialState(makeOrder(seeded(1)));
    expect(canAdvance(s, 0)).toBe(false); // Q1 job empty
    expect(canAdvance(s, 3)).toBe(false); // Q4 incomplete (Skip button instead)
    expect(canAdvance(s, 4)).toBe(false); // Q5 pairs unanswered
    expect(canAdvance(s, 10)).toBe(true); // ZIP optional
    s.q11 = "2001";
    expect(canAdvance(s, 10)).toBe(false);
  });
});

describe("quiz rules", () => {
  it("shuffles without losing options, and keeps Q8 'No preference' last", () => {
    const order = makeOrder(seeded(42));
    expect([...order.q2].sort()).toEqual(Q2.options.map((o) => o.label).sort());
    expect([...order.q4].sort()).toEqual([...labels].sort());
    expect(order.q8.at(-1)).toBe(NO_PREFERENCE);
    expect(order.q8.slice(0, -1).sort()).toEqual([...Q8.regularity].sort());
    for (const c of Q9.categories) expect([...order.q9[c.id]].sort()).toEqual(c.chips.map((x) => x.label).sort());
    expect(shuffle([1, 2, 3, 4, 5], seeded(3))).not.toEqual(shuffle([1, 2, 3, 4, 5], seeded(4)));
  });

  it("Q4 tap-to-sort: 2 most, then 1 least, tap again to unpick", () => {
    let q4 = initialState(makeOrder()).q4;
    q4 = [labels[0], labels[1], labels[2], labels[3]].reduce(tapQ4, q4);
    expect(q4).toEqual({ most: [labels[0], labels[1]], least: labels[2] }); // 4th tap ignored
    q4 = tapQ4(q4, labels[0]);
    expect(q4).toEqual({ most: [labels[1]], least: labels[2] });
    q4 = tapQ4(q4, labels[2]);
    expect(q4.least).toBeNull();
  });

  it.each([
    ["", true],
    ["it's cool", true],
    ["Because it's fun!", true],
    ["money", true],
    ["because I like working with my hands", false],
    ["I want to help people feel better", false],
  ])("isVagueReason(%j) is %s", (text, expected) => {
    expect(isVagueReason(text)).toBe(expected);
  });
});
