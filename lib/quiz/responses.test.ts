import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { QuizResponsesSchema } from "./responses";

const FIXTURES = Array.from({ length: 10 }, (_, i) => `student_${String(i + 1).padStart(2, "0")}`);

const loadResponses = (id: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "fixtures", `${id}.json`), "utf8"))
    .quiz_responses;

/** A valid fixture, cloned so a test can break one field. */
const sample = () => structuredClone(QuizResponsesSchema.parse(loadResponses("student_01")));

describe("QuizResponsesSchema", () => {
  it.each(FIXTURES)("parses %s", (id) => {
    const result = QuizResponsesSchema.safeParse(loadResponses(id));
    expect(result.error?.issues).toBeUndefined();
  });

  /** student_01's Q4 answer, typed as answered (not skipped). */
  const q4Of = (r: ReturnType<typeof sample>) => {
    if (!r.q4_values_most_least) throw new Error("student_01 should answer Q4");
    return r.q4_values_most_least;
  };

  it("accepts a skipped Q4 as null", () => {
    const r = { ...sample(), q4_values_most_least: null };
    expect(QuizResponsesSchema.safeParse(r).success).toBe(true);
  });

  it("rejects a missing Q4 key (skip is null, not absent)", () => {
    const r: Partial<ReturnType<typeof sample>> = sample();
    delete r.q4_values_most_least;
    expect(QuizResponsesSchema.safeParse(r).success).toBe(false);
  });

  it("rejects partial Q4 picks", () => {
    const q4 = q4Of(sample());
    const partials = [
      { most_important: [q4.most_important[0]], least_important: q4.least_important },
      { most_important: q4.most_important, least_important: null },
      { most_important: q4.most_important },
      { most_important: [], least_important: q4.least_important },
    ];
    for (const p of partials) {
      expect(QuizResponsesSchema.safeParse({ ...sample(), q4_values_most_least: p }).success).toBe(false);
    }
  });

  it("rejects a Q4 label not in Q4_OPTIONS", () => {
    const r = sample();
    Object.assign(q4Of(r), { least_important: "Free snacks" });
    expect(QuizResponsesSchema.safeParse(r).success).toBe(false);
  });

  it("rejects a Q4 least pick that repeats a most pick", () => {
    const r = sample();
    const q4 = q4Of(r);
    q4.least_important = q4.most_important[0];
    expect(QuizResponsesSchema.safeParse(r).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const r = { ...sample(), family_income_tier: "Tier 2" };
    expect(QuizResponsesSchema.safeParse(r).success).toBe(false);
  });
});
