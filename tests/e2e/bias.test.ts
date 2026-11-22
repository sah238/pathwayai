/** Check 3: ZIP and income never change the three selected careers. */
import { describe, expect, it } from "vitest";
import { selectCards, type SelectResult } from "@/lib/match/selectCards";
import { ALL_CASE_IDS, INCOME_TIER_IDS, REGION_ZIPS, fixture, recommend, repo, type QuizResponses } from "./harness";

const picks = (r: SelectResult) =>
  r.kind === "nudge" ? r : { kind: r.kind, mode: r.mode, cards: r.cards.map((c) => ({ soc: c.soc, slot: c.slot })) };

describe("check 3: bias", () => {
  describe.each(ALL_CASE_IDS)("%s", (id) => {
    const f = fixture(id);
    const occupations = repo.listOccupations();
    const baseline = picks(selectCards({ ...f.filters, zip_code: null }, { ...f.quiz, q11_zip_code: null }, occupations));

    it.each(Object.entries(REGION_ZIPS))("ZIP in %s leaves the careers and Claude requests unchanged", async (_region, zip) => {
      const quiz: QuizResponses = { ...f.quiz, q11_zip_code: zip };
      expect(picks(selectCards({ ...f.filters, zip_code: zip }, quiz, occupations))).toEqual(baseline);

      const base = await recommend(f, { ...f.quiz, q11_zip_code: null });
      const variant = await recommend(f, quiz);
      expect(variant.body).toEqual(base.body);
      expect(JSON.stringify(variant.create.mock.calls)).toBe(JSON.stringify(base.create.mock.calls));
    });

    it.each(INCOME_TIER_IDS)("income tier %i leaves the careers unchanged and is refused by the API", async (tier) => {
      const withIncome = { ...f.quiz, family_income_tier: tier };
      expect(picks(selectCards(f.filters, withIncome as QuizResponses, occupations))).toEqual(baseline);

      const { status, create } = await recommend(f, withIncome);
      expect(status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });
});
