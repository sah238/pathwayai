import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Q9 } from "@/components/quiz/questions";
import { getRepository } from "@/lib/data/server";
import { ExtractedFiltersSchema, type ExtractedFilters } from "@/lib/extract/schema";
import { QuizResponsesSchema, type QuizResponses } from "@/lib/quiz/responses";
import { AVOID_TABLE, avoidHits } from "./avoid";
import { DREAM_JOB_ALIASES } from "./dream-jobs";
import {
  MAX_FIT_SCORE,
  TITLE_BONUS,
  curiosityPoints,
  dreamJobMatches,
  interestPoints,
  matchesOwnTitle,
  withinCeilings,
} from "./score";
import {
  MATCH_WORDING_REVIEW_STATUS,
  NUDGE_MESSAGE,
  SelectionError,
  dreamJobLabel,
  selectCards,
  selectFromInput,
  toMatchInput,
  type Pick,
  type SelectResult,
} from "./selectCards";

const occupations = getRepository().listOccupations();
const socs = new Set(occupations.map((o) => o.soc_code));
const occ = (soc: string) => occupations.find((o) => o.soc_code === soc)!;

const dir = join(__dirname, "fixtures");
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => {
    const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
    return {
      id: raw.id as string,
      filters: ExtractedFiltersSchema.parse(raw.filters),
      quiz: QuizResponsesSchema.parse(raw.quiz_responses),
    };
  });
const fixture = (id: string) => fixtures.find((f) => f.id === id)!;

function cardsOf(r: SelectResult): [Pick, Pick, Pick] {
  if (r.kind !== "cards") throw new Error("expected cards");
  return r.cards;
}

describe("saved Stage 1 fixtures", () => {
  it("has all 12 (10 students + 2 edge cases)", () => {
    expect(fixtures.map((f) => f.id)).toEqual([
      "conflict_surgeon",
      "off_topic_pizza",
      ...Array.from({ length: 10 }, (_, i) => `student_${String(i + 1).padStart(2, "0")}`),
    ]);
  });

  for (const f of fixtures.filter((x) => x.filters.is_career_query)) {
    it(`${f.id}: three distinct, known careers`, () => {
      const cards = cardsOf(selectCards(f.filters, f.quiz, occupations));
      const ids = cards.map((c) => c.soc);
      expect(new Set(ids).size).toBe(3);
      for (const id of ids) expect(socs.has(id)).toBe(true);
    });
  }

  for (const f of fixtures.filter((x) => x.filters.is_career_query && !x.filters.has_constraint_conflict)) {
    it(`${f.id}: standard cards respect the ceilings and the slot rules`, () => {
      const r = selectCards(f.filters, f.quiz, occupations);
      expect(r).toMatchObject({ kind: "cards", mode: "standard" });
      const [direct, twoYear, adjacent] = cardsOf(r);
      expect([direct.slot, twoYear.slot, adjacent.slot]).toEqual(["direct", "two_year", "adjacent"]);
      for (const c of [direct, twoYear, adjacent]) {
        expect(withinCeilings(occ(c.soc), f.filters.max_education, f.filters.job_zone_ceiling)).toBe(true);
        expect(c.fallbacks.includes("avoid flags relaxed") || c.avoid_hits.length === 0).toBe(true);
      }
      expect(adjacent.breakdown.interest).toBeGreaterThan(0);
    });
  }

  it("off_topic_pizza gets the nudge, not cards", () => {
    const f = fixture("off_topic_pizza");
    expect(selectCards(f.filters, f.quiz, occupations)).toEqual({ kind: "nudge", message: NUDGE_MESSAGE });
  });

  it("student_01 (named Electrician) gets electricians as the direct match", () => {
    const f = fixture("student_01");
    const [direct] = cardsOf(selectCards(f.filters, f.quiz, occupations));
    expect(direct.soc).toBe("47-2111");
    expect(direct.breakdown.title).toBe(TITLE_BONUS);
  });
});

describe("conflict handling (student_05: surgeon, start working right away, avoids blood)", () => {
  const f = fixture("student_05");
  const r = selectCards(f.filters, f.quiz, occupations);

  it("is flagged as a conflict by Stage 1 and returns conflict mode", () => {
    expect(f.filters.has_constraint_conflict).toBe(true);
    expect(r).toMatchObject({ kind: "cards", mode: "conflict" });
  });

  it("card 1 is the closest career to Surgeon (an alias, not the real path), beyond the ceiling, with the avoid hit reported", () => {
    const [real] = cardsOf(r);
    expect(real.slot).toBe("closest_match");
    expect(real.breakdown.title_match).toBe("alias");
    expect(real.dream_job_label).toEqual({
      heading: "Closest career in our list to Surgeon",
      note: "Surgeon isn't in our career data yet.",
    });
    expect(DREAM_JOB_ALIASES.surgeon).toContain(real.soc);
    expect(withinCeilings(occ(real.soc), f.filters.max_education, f.filters.job_zone_ceiling)).toBe(false);
    expect(real.avoid_hits).toEqual(["blood_medical"]);
  });

  it("cards 2 and 3 are short-training alternatives without blood or medical work", () => {
    const [, a, b] = cardsOf(r);
    for (const c of [a, b]) {
      expect(c.slot).toBe("short_training");
      expect(withinCeilings(occ(c.soc), "Postsecondary nondegree award", 3)).toBe(true);
      expect(c.avoid_hits).toEqual([]);
      expect(AVOID_TABLE.blood_medical).not.toContain(c.soc);
    }
  });

  it("the plain-sentence surgeon edge case also gets conflict mode", () => {
    const e = fixture("conflict_surgeon");
    const res = selectCards(e.filters, e.quiz, occupations);
    expect(res).toMatchObject({ kind: "cards", mode: "conflict" });
    const [first] = cardsOf(res);
    expect(DREAM_JOB_ALIASES.surgeon).toContain(first.soc);
    expect(first.slot).toBe("closest_match");
    expect(first.dream_job_label?.heading).toBe("Closest career in our list to Surgeon");
  });

  const conflictWith = (dream_job: string | null) =>
    cardsOf(
      selectFromInput(
        { ...toMatchInput(f.filters, f.quiz), dream_job, avoid_flags: [] },
        occupations,
      ),
    )[0];

  it("a dream job that matches a roster title is the real path, with no closest-match label", () => {
    const first = conflictWith("Veterinarian");
    expect(first).toMatchObject({ soc: "29-1131", slot: "real_path", dream_job_label: null });
    expect(first.breakdown.title_match).toBe("title");
  });

  it("with no dream job, card 1 is a closest match with no label to show", () => {
    const first = conflictWith(null);
    expect(first.slot).toBe("closest_match");
    expect(first.breakdown.title_match).toBeNull();
    expect(first.dream_job_label).toBeNull();
  });

  it("student-facing wording is marked as a draft pending counselor review", () => {
    expect(MATCH_WORDING_REVIEW_STATUS).toBe("Draft — pending counselor review");
  });

  it("labels use what the student typed, trimmed", () => {
    expect(dreamJobLabel("  Brain surgeon ")).toEqual({
      heading: "Closest career in our list to Brain surgeon",
      note: "Brain surgeon isn't in our career data yet.",
    });
  });
});

describe("dream-job title and alias matching", () => {
  const matches = (job: string) => Object.fromEntries(dreamJobMatches(job, occupations));

  it("matches roster titles, singular forms included", () => {
    expect(matches("Electrician")).toEqual({ "47-2111": "title" });
    expect(matches("Registered Nurse")).toEqual({ "29-1141": "title" });
    expect(matchesOwnTitle("Veterinarian", occ("29-1131"))).toBe(true);
  });

  it("uses an alias only when no roster career matches by title", () => {
    // "nurse practitioner" contains the "nurse" alias, but NP's own title wins and RN gets nothing.
    expect(matches("nurse practitioner")).toEqual({ "29-1171": "title" });
    expect(matches("Pediatric Nurse")).toEqual({ "29-1141": "alias" });
  });

  it("prefers the longest alias when several match", () => {
    const table = { nurse: ["29-1141"], "nurse anesthetist": ["29-1171"] };
    expect(Object.fromEntries(dreamJobMatches("Certified nurse anesthetist", occupations, table))).toEqual({
      "29-1171": "alias",
    });
  });

  it("maps cybersecurity, programmer and coder to software developers", () => {
    for (const job of ["Cybersecurity Analyst", "Video game programmer", "Coder"]) {
      expect(matches(job), job).toEqual({ "15-1252": "alias" });
    }
    expect(matches("Encoder")).toEqual({});
  });

  const cardOne = (dream_job: string) => {
    const f = fixture("student_10"); // no ceilings, no conflict
    return cardsOf(selectFromInput({ ...toMatchInput(f.filters, f.quiz), dream_job, avoid_flags: [] }, occupations))[0];
  };

  it("a one-word lay title is a title match only as the entire dream job", () => {
    expect(matches("engineer")).toEqual({ "17-2081": "title" });
    expect(matches("  Engineers ")).toEqual({ "17-2081": "title" });
    expect(matches("Designer")).toEqual({ "27-1024": "title" });
    // Multi-word lay titles and career titles still match inside a phrase.
    expect(matches("software engineer")).toEqual({ "15-1252": "title" });
    expect(matches("Master Electrician")).toEqual({ "47-2111": "title" });
  });

  it("a one-word lay title inside a longer phrase counts like an alias", () => {
    expect(matches("aerospace engineer")).toEqual({ "17-2081": "alias" });
    expect(matches("diesel mechanic")).toEqual({ "49-9041": "alias" });
    expect(matches("tattoo artist")).toEqual({ "27-1024": "alias" });
  });

  it('"car mechanic" alias (longer) beats the one-word lay title "Mechanic"', () => {
    expect(matches("car mechanic")).toEqual({ "49-3023": "alias" });
    expect(matches("Car Mechanic at a dealership")).toEqual({ "49-3023": "alias" });
  });

  it('"car mechanic" and "tattoo artist" get the closest-match label', () => {
    for (const [job, soc] of [
      ["car mechanic", "49-3023"],
      ["tattoo artist", "27-1024"],
    ] as const) {
      const card = cardOne(job);
      expect(card.soc, job).toBe(soc);
      expect(card.dream_job_label, job).toEqual(dreamJobLabel(job));
    }
  });

  it('"engineer" alone stays an unlabeled title match', () => {
    expect(cardOne("engineer")).toMatchObject({ soc: "17-2081", dream_job_label: null });
    expect(cardOne("engineer").breakdown.title_match).toBe("title");
  });

  it('"aerospace engineer" in conflict mode is a labeled closest match, not real_path', () => {
    const f = fixture("student_05");
    const [first] = cardsOf(
      selectFromInput({ ...toMatchInput(f.filters, f.quiz), dream_job: "aerospace engineer", avoid_flags: [] }, occupations),
    );
    expect(first).toMatchObject({
      soc: "17-2081",
      slot: "closest_match",
      dream_job_label: dreamJobLabel("aerospace engineer"),
    });
  });

  it('"nurse practitioner" gives Nurse Practitioners as card 1 with no label', () => {
    expect(cardOne("nurse practitioner")).toMatchObject({ soc: "29-1171", slot: "direct", dream_job_label: null });
  });

  it('"nurse" alone gives Registered Nurses as card 1 with the alias label', () => {
    expect(cardOne("nurse")).toMatchObject({ soc: "29-1141", slot: "direct", dream_job_label: dreamJobLabel("nurse") });
  });

  it("student_04 (Cybersecurity Analyst) gets software developers as the direct match, labeled as closest", () => {
    const f = fixture("student_04");
    const [direct] = cardsOf(selectCards(f.filters, f.quiz, occupations));
    expect(direct).toMatchObject({
      soc: "15-1252",
      slot: "direct",
      dream_job_label: {
        heading: "Closest career in our list to Cybersecurity Analyst",
        note: "Cybersecurity Analyst isn't in our career data yet.",
      },
    });
  });

  it("labels alias-matched standard cards (student_02 nurse, student_09 chef)", () => {
    for (const [id, soc, typed] of [
      ["student_02", "29-1141", "Pediatric Nurse"],
      ["student_09", "35-2014", "Chef or Restaurant Manager"],
    ] as const) {
      const f = fixture(id);
      const [direct] = cardsOf(selectCards(f.filters, f.quiz, occupations));
      expect(direct.soc).toBe(soc);
      expect(direct.breakdown.title_match).toBe("alias");
      expect(direct.dream_job_label).toEqual(dreamJobLabel(typed));
    }
  });

  it("leaves title matches unlabeled (student_01 Electrician)", () => {
    const f = fixture("student_01");
    const [direct] = cardsOf(selectCards(f.filters, f.quiz, occupations));
    expect(direct.breakdown.title_match).toBe("title");
    expect(direct.dream_job_label).toBeNull();
  });

  it("every fixture card is labeled exactly when it is an alias match or a closest match", () => {
    for (const f of fixtures.filter((x) => x.filters.is_career_query)) {
      for (const c of cardsOf(selectCards(f.filters, f.quiz, occupations))) {
        const expected =
          f.quiz.q1_dream_job.job && (c.breakdown.title_match === "alias" || c.slot === "closest_match")
            ? dreamJobLabel(f.quiz.q1_dream_job.job)
            : null;
        expect(c.dream_job_label, `${f.id} ${c.soc}`).toEqual(expected);
      }
    }
  });
});

describe("curiosity", () => {
  it("scores the position of Investigative in riasec_code", () => {
    expect(curiosityPoints("IRC")).toBe(3);
    expect(curiosityPoints("RIC")).toBe(2);
    expect(curiosityPoints("RCI")).toBe(1);
    expect(curiosityPoints("RCE")).toBe(0);
  });

  it("weights it by the student's rank (student_04 puts curiosity first)", () => {
    const f = fixture("student_04");
    expect(f.filters.work_values[0]).toBe("curiosity");
    const [direct] = cardsOf(selectCards(f.filters, f.quiz, occupations));
    const item = direct.breakdown.values.find((v) => v.value === "curiosity")!;
    expect(item.student_weight).toBe(3);
    expect(item.career_points).toBe(curiosityPoints(occ(direct.soc).work_profile.riasec_code));
    expect(item.points).toBe(item.student_weight * item.career_points);
  });

  it("scores careers whose work values are not rated (software developers, ICR)", () => {
    const f = fixture("student_04");
    const input = toMatchInput(f.filters, f.quiz);
    const only = selectFromInput(
      { ...input, has_constraint_conflict: true },
      occupations.filter((o) => ["15-1252", "47-2111", "47-2152", "49-9041"].includes(o.soc_code)),
    );
    const dev = cardsOf(only).find((c) => c.soc === "15-1252")!;
    expect(dev.breakdown.values.find((v) => v.value === "curiosity")!.points).toBe(9);
    expect(dev.breakdown.values.find((v) => v.value === "working_conditions")!.points).toBe(0);
  });
});

describe("determinism and inputs that must not matter", () => {
  const f = fixture("student_02");
  const base = selectCards(f.filters, f.quiz, occupations);

  it("gives the same answer every run and for any occupation order", () => {
    expect(selectCards(f.filters, f.quiz, occupations)).toEqual(base);
    expect(selectCards(f.filters, f.quiz, [...occupations].reverse())).toEqual(base);
  });

  it("ignores ZIP (filters and quiz) and work-context answers", () => {
    const filters: ExtractedFilters = { ...f.filters, zip_code: "22201", work_context: ["Outdoors"] };
    const quiz: QuizResponses = {
      ...f.quiz,
      q11_zip_code: "90210",
      q6_work_setting: { indoors_outdoors: "Outdoors", desk_moving: "On my feet and moving" },
      q7_working_with_public: "Very little",
      q8_schedule: { regularity: "No preference", weekly_hours: "No preference" },
    };
    expect(selectCards(filters, quiz, occupations)).toEqual(base);
  });

  it("breaks score ties by SOC code", () => {
    const input = { ...toMatchInput(f.filters, f.quiz), interest_tags: [], work_values: [], dream_job: null, avoid_flags: [] };
    const cards = cardsOf(selectFromInput({ ...input, has_constraint_conflict: true }, occupations));
    expect(cards[0].soc).toBe([...socs].sort()[0]);
  });
});

describe("hard filters and fallbacks", () => {
  const f = fixture("student_10");
  const input = toMatchInput(f.filters, f.quiz);

  it("null ceilings allow every education level", () => {
    expect(input.max_education).toBeNull();
    expect(cardsOf(selectFromInput(input, occupations))).toHaveLength(3);
  });

  it("never picks a career above the ceilings", () => {
    const tight = { ...input, max_education: "High school diploma or equivalent" as const, job_zone_ceiling: 2 };
    for (const c of cardsOf(selectFromInput(tight, occupations))) {
      expect(withinCeilings(occ(c.soc), tight.max_education, tight.job_zone_ceiling)).toBe(true);
    }
  });

  it("relaxes the avoid filter rather than return fewer than three cards", () => {
    const pool = occupations.filter((o) => ["29-1141", "29-2042", "29-2056", "47-2111"].includes(o.soc_code));
    const cards = cardsOf(selectFromInput({ ...input, avoid_flags: ["blood_medical"] }, pool));
    expect(cards.some((c) => c.fallbacks.includes("avoid flags relaxed"))).toBe(true);
  });

  it("throws when fewer than three careers pass the ceilings", () => {
    const cooksOnly = { ...input, max_education: "No formal educational credential" as const };
    expect(() => selectFromInput(cooksOnly, occupations)).toThrow(SelectionError);
  });
});

describe("scoring tables", () => {
  it("interest overlap weights both ranks", () => {
    expect(interestPoints(["R", "I", "C"], "RIC")).toBe(14);
    expect(interestPoints(["S"], "RCS")).toBe(3);
    expect(interestPoints([], "RIC")).toBe(0);
  });

  it("the title bonus outranks any fit score", () => {
    expect(TITLE_BONUS).toBeGreaterThan(MAX_FIT_SCORE);
  });

  it("the avoid table covers exactly the Q9 flags and only roster careers", () => {
    const flags = Q9.categories.flatMap((c) => c.chips.map((ch) => ch.flag)).sort();
    expect(Object.keys(AVOID_TABLE).sort()).toEqual(flags);
    for (const list of Object.values(AVOID_TABLE)) for (const soc of list) expect(socs.has(soc)).toBe(true);
    expect(avoidHits("29-1141", ["blood_medical", "unknown_flag"])).toEqual(["blood_medical"]);
  });

  it("dream-job aliases point only to roster careers", () => {
    for (const list of Object.values(DREAM_JOB_ALIASES)) for (const soc of list) expect(socs.has(soc)).toBe(true);
  });
});
