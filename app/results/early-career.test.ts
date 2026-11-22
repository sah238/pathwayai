import { describe, expect, it } from "vitest";
import { getRepository } from "@/lib/data/server";
import { AiExposureTierSchema, EntryEducationSchema } from "@/lib/data/schemas";
import { EARLY_CAREER_SOURCE, EARLY_CAREER_TABLE, earlyCareerFlag } from "./early-career";
import { FIRST_STEPS } from "./first-steps";
import { buildCardViewModel } from "./view-model";

const repo = getRepository();

describe("EARLY_CAREER_TABLE", () => {
  it("follows the written rule in every cell: High/Very high tier AND bachelor's or higher", () => {
    const highTiers = ["High", "Very high"];
    const baPlus = ["Bachelor's degree", "Master's degree", "Doctoral or professional degree"];
    for (const edu of EntryEducationSchema.options) {
      for (const tier of AiExposureTierSchema.options) {
        expect(EARLY_CAREER_TABLE[edu][tier], `${edu} × ${tier}`).toBe(highTiers.includes(tier) && baPlus.includes(edu));
      }
    }
  });

  it("flags exactly these 12 careers in the current dataset", () => {
    const flagged = repo
      .listOccupations()
      .filter((o) => earlyCareerFlag(o.education_and_training.entry_education, o.projections_2025_2035.ai_exposure_tier))
      .map((o) => o.soc_code)
      .sort();
    expect(flagged).toEqual(
      [
        "13-2011", "15-1252", "15-2051", "17-2081", "17-2141", "19-1023",
        "19-3033", "25-2021", "27-1024", "29-1131", "29-1141", "29-1171",
      ].sort(),
    );
  });

  it("shows for software developers, not for high-school-entry or Low-tier careers", () => {
    expect(buildCardViewModel(repo, "15-1252")!.expand.outlook.early_career).toMatchObject({
      badge: "Early-career caution",
      source: EARLY_CAREER_SOURCE,
    });
    for (const soc of ["43-4051", "47-2111", "29-1071"]) {
      expect(buildCardViewModel(repo, soc)!.expand.outlook.early_career, soc).toBeNull();
    }
  });

  it("uses cautious wording, never a prediction", () => {
    const flag = earlyCareerFlag("Bachelor's degree", "Very high")!;
    expect(flag.text).toMatch(/research has found fewer young workers being hired in jobs like this/i);
    expect(flag.text).toMatch(/not a prediction/);
    expect(flag.source.source_url).toBe("https://digitaleconomy.stanford.edu/publications/canaries-in-the-coal-mine/");
  });
});

describe("FIRST_STEPS", () => {
  it("has a sentence for every training pathway, with no numbers", () => {
    for (const occ of repo.listOccupations()) {
      expect(FIRST_STEPS[occ.education_and_training.training_pathway]).toBeTruthy();
    }
    for (const text of Object.values(FIRST_STEPS)) expect(text).not.toMatch(/\d/);
  });
});
