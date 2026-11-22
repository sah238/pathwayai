/** Check 2: off-topic, conflict and API-failure routing. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createRecommendHandler } from "@/app/api/recommend/handler";
import { fakeClient } from "@/app/api/recommend/test-helpers";
import { SLOT_LABELS } from "@/components/cards/personalize";
import { ERROR_HEADING, FinishScreen } from "@/components/quiz/FinishScreen";
import { submitQuiz } from "@/components/quiz/submit";
import { NUDGE_MESSAGE } from "@/lib/match/selectCards";
import { STUDENT_IDS, fixture, recommend, renderCard, repo, viewModel, visibleText, ZIP_VIEWS } from "./harness";

const finish = (outcome: Parameters<typeof FinishScreen>[0]["outcome"]) =>
  renderToStaticMarkup(createElement(FinishScreen, { outcome, onBack() {}, onStartOver() {}, onRetry() {} }));

describe("check 2: routing", () => {
  it("pizza shows the nudge and makes no Stage 2 call", async () => {
    const { status, body, create } = await recommend(fixture("off_topic_pizza"));
    expect(status).toBe(200);
    expect(body).toEqual({ kind: "nudge", message: NUDGE_MESSAGE });
    expect(create).toHaveBeenCalledTimes(1);
    expect(visibleText(finish({ kind: "nudge", message: NUDGE_MESSAGE }))).toContain(NUDGE_MESSAGE);
  });

  it.each(["student_05", "conflict_surgeon"])("%s shows the conflict labels", async (id) => {
    const { body } = await recommend(fixture(id));
    if (body.kind !== "cards") throw new Error("expected cards");
    expect(body.mode).toBe("conflict");
    expect(body.cards.map((c) => c.slot)).toEqual(["closest_match", "short_training", "short_training"]);

    const first = visibleText(renderCard(viewModel(body.cards[0].soc), ZIP_VIEWS[0].status, null, body.cards[0]));
    expect(first).toContain(SLOT_LABELS.closest_match);
    expect(first).toContain("Closest career in our list to Surgeon");
    expect(first).toContain("Surgeon isn't in our career data yet.");
    for (const card of body.cards.slice(1)) {
      const text = visibleText(renderCard(viewModel(card.soc), ZIP_VIEWS[0].status, null, card));
      expect(text).toContain(SLOT_LABELS.short_training);
    }
  });

  it.each(STUDENT_IDS.filter((id) => id !== "student_05"))("%s stays in standard mode", async (id) => {
    const { body } = await recommend(fixture(id));
    if (body.kind !== "cards") throw new Error("expected cards");
    expect(body.mode).toBe("standard");
  });

  describe("an API failure leads to /browse", () => {
    const f = fixture("student_01");
    const via = (getClient: Parameters<typeof createRecommendHandler>[0]) => {
      const POST = createRecommendHandler(getClient, () => repo);
      return ((url: string, init?: RequestInit) => POST(new Request(`http://localhost${url}`, init))) as typeof fetch;
    };
    const failures: [string, () => typeof fetch][] = [
      ["no API key", () => via(() => null)],
      ["Stage 1 upstream error", () => via(() => fakeClient(f.filters, { stage1: "throw" }).client)],
      ["network error", () => vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch],
      ["malformed response", () => vi.fn().mockResolvedValue(Response.json({ kind: "cards" })) as unknown as typeof fetch],
    ];

    it.each(failures)("%s", async (_name, fetchFn) => {
      const outcome = await submitQuiz(f.quiz, fetchFn());
      expect(outcome).toEqual({ kind: "error" });
      const html = finish({ kind: "error" });
      expect(html).toContain(ERROR_HEADING);
      expect(html).toMatch(/<a[^>]*href="\/browse"/);
    });
  });
});
