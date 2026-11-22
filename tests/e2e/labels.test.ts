/**
 * Check 6: draft wording keeps a visible counselor-review label. `it.fails`
 * marks confirmed bugs (F1 and F2 in docs/test-report.md): each will start
 * failing, as a prompt to remove `.fails`, once s10-fixes corrects it.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EARLY_CAREER_WORDING_STATUS } from "@/app/results/early-career";
import { FIRST_STEP_REVIEW_STATUS } from "@/app/results/first-steps";
import { GUIDE_REVIEW_STATUS } from "@/app/results/guide-prompts";
import { CounselorGuide } from "@/components/cards/CounselorGuide";
import { FIT_VALUES_INTRO, PERSONALIZE_WORDING_REVIEW_STATUS, SLOT_LABELS } from "@/components/cards/personalize";
import { FinishScreen, ERROR_BODY } from "@/components/quiz/FinishScreen";
import { initialState, makeOrder } from "@/components/quiz/logic";
import { Q1 } from "@/components/quiz/questions";
import { QuestionScreen } from "@/components/quiz/screens";
import { MATCH_WORDING_REVIEW_STATUS, NUDGE_MESSAGE, selectCards } from "@/lib/match/selectCards";
import { cardsFor, fixture, recommend, renderCard, repo, viewModel, visibleText, ZIP_VIEWS } from "./harness";

const DRAFT_LABEL = "draft — pending counselor review";
const noZip = ZIP_VIEWS[0].status;
const finish = (outcome: Parameters<typeof FinishScreen>[0]["outcome"]) =>
  visibleText(renderToStaticMarkup(createElement(FinishScreen, { outcome, onBack() {}, onStartOver() {}, onRetry() {} })));

/** Glance layer only: the Expand panel's own label must not count for the card's top. */
async function glance(id: string, index = 0) {
  const card = (await cardsFor(id))[index];
  return visibleText(renderCard(viewModel(card.soc), noZip, null, card, false));
}

describe("check 6: draft labels", () => {
  it("every review-status constant still says draft", () => {
    for (const status of [
      FIRST_STEP_REVIEW_STATUS,
      EARLY_CAREER_WORDING_STATUS,
      GUIDE_REVIEW_STATUS,
      MATCH_WORDING_REVIEW_STATUS,
      PERSONALIZE_WORDING_REVIEW_STATUS,
    ]) {
      expect(status).toBe("Draft — pending counselor review");
    }
  });

  it("first-step wording shows its label on every roster card", () => {
    for (const occ of repo.listOccupations()) {
      const text = visibleText(renderCard(viewModel(occ.soc_code), noZip, null)).toLowerCase();
      expect(text).toContain(`wording: ${DRAFT_LABEL}`);
    }
  });

  it("the early-career flag shows its label wherever it appears", () => {
    const flagged = repo.listOccupations().filter((o) => viewModel(o.soc_code).expand.outlook.early_career);
    expect(flagged.length).toBeGreaterThan(0);
    for (const occ of flagged) {
      const text = visibleText(renderCard(viewModel(occ.soc_code), noZip, null));
      const after = text.slice(text.indexOf("Early-career caution")).toLowerCase();
      expect(after).toContain(`wording: ${DRAFT_LABEL}`);
    }
  });

  it("the printed guide shows its label", async () => {
    const vms = (await cardsFor("student_01")).map((c) => viewModel(c.soc));
    const text = visibleText(renderToStaticMarkup(createElement(CounselorGuide, { cards: vms, zip: noZip, tier: null })));
    expect(text.toLowerCase()).toContain(DRAFT_LABEL);
  });

  describe("F1: draft wording shown without a visible label", () => {
    it.fails("card slot labels (components/cards/CareerCard.tsx:214)", async () => {
      const text = await glance("student_01");
      expect(text).toContain(SLOT_LABELS.direct);
      expect(text.toLowerCase()).toContain(DRAFT_LABEL);
    });

    it.fails("Why it fits you wording (components/cards/CareerCard.tsx:256)", async () => {
      const text = await glance("student_01");
      expect(text).toContain(FIT_VALUES_INTRO);
      expect(text.toLowerCase()).toContain(DRAFT_LABEL);
    });

    it.fails("closest-match heading and note (components/cards/CareerCard.tsx:225)", async () => {
      const text = await glance("student_05");
      expect(text).toContain("Closest career in our list to Surgeon");
      expect(text.toLowerCase()).toContain(DRAFT_LABEL);
    });

    it.fails("off-topic nudge (components/quiz/FinishScreen.tsx:50)", () => {
      const text = finish({ kind: "nudge", message: NUDGE_MESSAGE });
      expect(text).toContain(NUDGE_MESSAGE);
      expect(text.toLowerCase()).toContain(DRAFT_LABEL);
    });

    it.fails("API-failure message (components/quiz/FinishScreen.tsx:67)", () => {
      const text = finish({ kind: "error" });
      expect(text).toContain(ERROR_BODY);
      expect(text.toLowerCase()).toContain(DRAFT_LABEL);
    });

    it.fails("finish-screen wait message (components/quiz/FinishScreen.tsx:37)", () => {
      expect(finish({ kind: "loading" }).toLowerCase()).toContain(DRAFT_LABEL);
    });

    it.fails("quiz question wording (components/quiz/screens.tsx:417)", () => {
      const html = renderToStaticMarkup(
        createElement(QuestionScreen, {
          step: 0,
          s: initialState(makeOrder()),
          update() {},
          seed: 0,
          onSkipQ4() {},
        }),
      );
      expect(visibleText(html)).toContain(Q1.jobLabel);
      expect(visibleText(html).toLowerCase()).toContain(DRAFT_LABEL);
    });
  });

  describe("F2: student_05's avoid-list warning", () => {
    const f = fixture("student_05");

    it("selection records the avoid hit on the first card", () => {
      const result = selectCards(f.filters, f.quiz, repo.listOccupations());
      if (result.kind !== "cards") throw new Error("expected cards");
      expect(result.cards[0].avoid_hits).toEqual(["blood_medical"]);
    });

    it.fails("the API response keeps it (app/api/recommend/handler.ts:104)", async () => {
      const { body } = await recommend(f);
      expect(JSON.stringify(body)).toContain("blood_medical");
    });

    it.fails("the card tells the student (components/cards/CareerCard.tsx:203)", async () => {
      expect(await glance("student_05")).toContain("Blood or medical procedures");
    });
  });
});
