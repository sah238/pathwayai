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

  it("rejects a Q4 label not in Q4_OPTIONS", () => {
    const r = sample();
    Object.assign(r.q4_values_most_least, { least_important: "Free snacks" });
    expect(QuizResponsesSchema.safeParse(r).success).toBe(false);
  });

  it("rejects a Q4 least pick that repeats a most pick", () => {
    const r = sample();
    r.q4_values_most_least.least_important = r.q4_values_most_least.most_important[0];
    expect(QuizResponsesSchema.safeParse(r).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const r = { ...sample(), family_income_tier: "Tier 2" };
    expect(QuizResponsesSchema.safeParse(r).success).toBe(false);
  });
});
