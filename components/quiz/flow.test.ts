/**
 * End-to-end flow with Claude mocked: the quiz's submit helper calls the real
 * /api/recommend handler, hands off in memory, and the results page renders
 * (react-dom/server, no extra packages).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecommendHandler } from "@/app/api/recommend/handler";
import { fakeClient, fixture, repo, summaryFor, type Fixture } from "@/app/api/recommend/test-helpers";
import { ResultsClient } from "@/app/results/ResultsClient";
import { buildCardViewModel, type CardViewModel } from "@/app/results/view-model";
import { SLOT_LABELS } from "@/components/cards/personalize";
import { NUDGE_MESSAGE } from "@/lib/match/selectCards";
import { OUTSIDE_REGION_ZIP_MESSAGE } from "@/lib/shared-text";
import { ERROR_HEADING, FinishScreen } from "./FinishScreen";
import { Q11 } from "./questions";
import { clearHandoff, getHandoff, setHandoff } from "./recommend-store";
import { resultsUrl, submitQuiz } from "./submit";

/** A fetch that runs the real route handler in-process. */
function fetchVia(f: Fixture, opts: Parameters<typeof fakeClient>[1] = {}, withKey = true) {
  const { client, create } = fakeClient(f.filters, opts);
  const POST = createRecommendHandler(() => (withKey ? client : null), () => repo);
  const fetchFn = vi.fn((url: string, init?: RequestInit) => POST(new Request(`http://localhost${url}`, init)));
  return { fetchFn: fetchFn as unknown as typeof fetch, create, calls: fetchFn.mock.calls };
}

function renderResults(socs: readonly string[]): string {
  const cards = socs.map((s) => buildCardViewModel(repo, s)) as CardViewModel[];
  return renderToStaticMarkup(createElement(ResultsClient, { cards }));
}

const renderFinish = (outcome: Parameters<typeof FinishScreen>[0]["outcome"]) =>
  renderToStaticMarkup(createElement(FinishScreen, { outcome, onBack() {}, onStartOver() {}, onRetry() {} }));

afterEach(() => clearHandoff());

describe("quiz → /api/recommend → results", () => {
  it("student_01 lands on three cards with summaries and Why it fits you", async () => {
    const f = fixture("student_01");
    const { fetchFn } = fetchVia(f);
    const out = await submitQuiz(f.quiz, fetchFn);
    if (out.kind !== "cards") throw new Error("expected cards");

    setHandoff({ socs: out.socs, zip: f.quiz.q11_zip_code, cards: out.cards });
    const html = renderResults(out.socs);

    expect(html.match(/<article/g)).toHaveLength(3);
    for (const soc of out.socs) expect(html).toContain(summaryFor(soc));
    expect(html).toContain("Why it fits you");
    for (const slot of ["direct", "two_year", "adjacent"] as const) expect(html).toContain(SLOT_LABELS[slot]);
    // ZIP box is pre-filled from the quiz and still an editable input.
    expect(html).toMatch(new RegExp(`<input[^>]*value="${f.quiz.q11_zip_code}"`));
  });

  it("student_05 shows the conflict labels on the results page", async () => {
    const f = fixture("student_05");
    const out = await submitQuiz(f.quiz, fetchVia(f).fetchFn);
    if (out.kind !== "cards") throw new Error("expected cards");
    setHandoff({ socs: out.socs, zip: f.quiz.q11_zip_code, cards: out.cards });
    const html = renderResults(out.socs);
    expect(html).toContain(SLOT_LABELS.closest_match);
    expect(html).toContain(SLOT_LABELS.short_training);
    expect(html).toContain("Closest career in our list to Surgeon");
    expect(html).toContain("Surgeon isn&#x27;t in our career data yet.");
  });

  it("off_topic_pizza shows the nudge with a way back to the quiz", async () => {
    const f = fixture("off_topic_pizza");
    const out = await submitQuiz(f.quiz, fetchVia(f).fetchFn);
    expect(out).toEqual({ kind: "nudge", message: NUDGE_MESSAGE });
    const html = renderFinish({ kind: "nudge", message: NUDGE_MESSAGE });
    expect(html).toContain("PathwayAI helps you explore careers.");
    expect(html).toContain("Back to the quiz");
  });

  it("the results URL carries only the three career codes", async () => {
    const f = fixture("student_05");
    const out = await submitQuiz(f.quiz, fetchVia(f).fetchFn);
    if (out.kind !== "cards") throw new Error("expected cards");
    const url = resultsUrl(out.socs);
    expect(url).toMatch(/^\/results\?socs=\d{2}-\d{4},\d{2}-\d{4},\d{2}-\d{4}$/);
    expect(url).not.toContain(f.quiz.q11_zip_code!);
    expect(url).not.toMatch(/zip|income|tier|surgeon/i);
  });

  it("ZIP and income never reach the Claude request", async () => {
    const f = fixture("student_01");
    const { fetchFn, create } = fetchVia(f);
    await submitQuiz(f.quiz, fetchFn);
    const sent = JSON.stringify(create.mock.calls);
    expect(sent).not.toContain(f.quiz.q11_zip_code!);
    expect(sent).not.toMatch(/zip|income/i);
  });
});

describe("when /api/recommend fails", () => {
  const f = fixture("student_01");

  it("a missing API key gives the error outcome", async () => {
    expect(await submitQuiz(f.quiz, fetchVia(f, {}, false).fetchFn)).toEqual({ kind: "error" });
  });

  it("a Stage 1 failure, a network error, a bad body or a timeout gives the error outcome", async () => {
    expect(await submitQuiz(f.quiz, fetchVia(f, { stage1: "throw" }).fetchFn)).toEqual({ kind: "error" });
    const offline = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    expect(await submitQuiz(f.quiz, offline)).toEqual({ kind: "error" });
    const junk = vi.fn().mockResolvedValue(Response.json({ kind: "cards", cards: [] })) as unknown as typeof fetch;
    expect(await submitQuiz(f.quiz, junk)).toEqual({ kind: "error" });
    const hang = ((_: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))))) as typeof fetch;
    expect(await submitQuiz(f.quiz, hang, 10)).toEqual({ kind: "error" });
  });

  it("the error screen links to /browse", () => {
    const html = renderFinish({ kind: "error" });
    expect(html).toContain(ERROR_HEADING);
    expect(html).toMatch(/<a[^>]*href="\/browse"/);
  });
});

describe("results page without the quiz handoff (refresh or shared link)", () => {
  it("keeps What this job rewards and the task list, with an empty ZIP box", () => {
    const html = renderResults(repo.listOccupations().slice(0, 3).map((o) => o.soc_code));
    expect(html).toContain("What this job rewards");
    expect(html).not.toContain("Why it fits you");
    expect(html).not.toMatch(/<input[^>]*value="\d/);
  });

  it("ignores a handoff for different careers", async () => {
    const f = fixture("student_01");
    const out = await submitQuiz(f.quiz, fetchVia(f).fetchFn);
    if (out.kind !== "cards") throw new Error("expected cards");
    setHandoff({ socs: out.socs, zip: "22201", cards: out.cards });
    expect(getHandoff([...out.socs].reverse())).toBeNull();
    expect(getHandoff(out.socs)).not.toBeNull();
  });
});

describe("shared out-of-region ZIP message", () => {
  it("is the same constant in the quiz and on the results page", async () => {
    expect(Q11.outsideRegion).toBe(OUTSIDE_REGION_ZIP_MESSAGE);
    const f = fixture("student_01");
    const out = await submitQuiz(f.quiz, fetchVia(f).fetchFn);
    if (out.kind !== "cards") throw new Error("expected cards");
    setHandoff({ socs: out.socs, zip: "10001", cards: out.cards }); // New York
    expect(renderResults(out.socs)).toContain(OUTSIDE_REGION_ZIP_MESSAGE);
  });
});
