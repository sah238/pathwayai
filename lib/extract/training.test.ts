import { describe, expect, it } from "vitest";
import { Q10 } from "@/components/quiz/questions";
import { Q10_TRAINING_TABLE, trainingCeiling } from "./training";

describe("Q10 training table", () => {
  it("has an entry for every Q10 answer the quiz can store", () => {
    for (const { value } of Q10.options) {
      expect(Object.hasOwn(Q10_TRAINING_TABLE, value), `missing "${value}"`).toBe(true);
    }
  });

  it("has no entries the quiz cannot produce", () => {
    expect(Object.keys(Q10_TRAINING_TABLE).sort()).toEqual(Q10.options.map((o) => o.value).sort());
  });

  it("sets no ceiling for an unknown answer", () => {
    expect(trainingCeiling("About 1–2 years")).toEqual({ max_education: null, job_zone_ceiling: null });
  });
});
