import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Q9 } from "@/components/quiz/questions";
import { getRepository } from "@/lib/data/server";
import { ExtractedFiltersSchema, type ExtractedFilters } from "@/lib/extract/schema";
import { QuizResponsesSchema, type QuizResponses } from "@/lib/quiz/responses";
import { AVOID_TABLE, avoidHits } from "./avoid";
import { DREAM_JOB_ALIASES } from "./dream-jobs";
import { MAX_FIT_SCORE, TITLE_BONUS, curiosityPoints, interestPoints, titleMatch, withinCeilings } from "./score";
import {
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

  it("labels use what the student typed, trimmed", () => {
    expect(dreamJobLabel("  Brain surgeon ")).toEqual({
      heading: "Closest career in our list to Brain surgeon",
      note: "Brain surgeon isn't in our career data yet.",
    });
  });
});

describe("dream-job title and alias matching", () => {
  it("prefers a roster title over an alias", () => {
    expect(titleMatch("Electrician", occ("47-2111"))).toBe("title");
    expect(titleMatch("Registered Nurse", occ("29-1141"))).toBe("title");
    expect(titleMatch("Pediatric Nurse", occ("29-1141"))).toBe("alias");
  });

  it("maps cybersecurity, programmer and coder to software developers", () => {
    for (const job of ["Cybersecurity Analyst", "Video game programmer", "Coder"]) {
      expect(titleMatch(job, occ("15-1252")), job).toBe("alias");
    }
    expect(titleMatch("Encoder", occ("15-1252"))).toBeNull();
  });

  it("student_04 (Cybersecurity Analyst) gets software developers as the direct match", () => {
    const f = fixture("student_04");
    const [direct] = cardsOf(selectCards(f.filters, f.quiz, occupations));
    expect(direct).toMatchObject({ soc: "15-1252", slot: "direct", dream_job_label: null });
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
