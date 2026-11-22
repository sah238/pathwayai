/**
 * Shared helpers for the end-to-end checks in docs/test-report.md. Requests run
 * through the real /api/recommend handler with a fake Claude client, using the
 * saved Stage 1 output in lib/match/fixtures.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRecommendHandler } from "@/app/api/recommend/handler";
import { fakeClient, fixture, post, repo, type Fixture } from "@/app/api/recommend/test-helpers";
import type { RecommendedCard, RecommendResponse } from "@/app/api/recommend/types";
import { zipStatus, type ZipStatus } from "@/app/results/select";
import { buildCardViewModel, type CardViewModel } from "@/app/results/view-model";
import { CareerCard } from "@/components/cards/CareerCard";
import { cardExtras } from "@/components/cards/personalize";
import type { IncomeTier } from "@/lib/calc/net-price";
import type { QuizResponses } from "@/lib/quiz/responses";

export { fixture, repo };

export const STUDENT_IDS = Array.from({ length: 10 }, (_, i) => `student_${String(i + 1).padStart(2, "0")}`);
export const ALL_CASE_IDS = [...STUDENT_IDS, "off_topic_pizza", "conflict_surgeon"];
export const CARD_CASE_IDS = ALL_CASE_IDS.filter((id) => id !== "off_topic_pizza");

/** One ZIP per bias and display region. */
export const REGION_ZIPS = { DC: "20001", MD: "20910", VA: "22201", outside: "10001" } as const;
export const INCOME_TIER_IDS: IncomeTier[] = [1, 2, 3, 4, 5];

/** Every ZIP and income view a card can show. */
export const ZIP_VIEWS: { name: string; status: ZipStatus }[] = [
  { name: "no ZIP", status: zipStatus("") },
  ...Object.entries(REGION_ZIPS).map(([name, zip]) => ({ name, status: zipStatus(zip) })),
];
export const TIER_VIEWS: (IncomeTier | null)[] = [null, ...INCOME_TIER_IDS];

export async function recommend(
  f: Fixture,
  body: unknown = f.quiz,
  opts: Parameters<typeof fakeClient>[1] = {},
) {
  const { client, create } = fakeClient(f.filters, opts);
  const POST = createRecommendHandler(() => client, () => repo);
  const res = await POST(post(body));
  const json = (await res.json()) as RecommendResponse & { error?: string };
  return { status: res.status, body: json, create };
}

export async function cardsFor(id: string): Promise<RecommendedCard[]> {
  const { body } = await recommend(fixture(id));
  if (body.kind !== "cards") throw new Error(`${id}: expected cards, got ${JSON.stringify(body)}`);
  return body.cards;
}

export function viewModel(soc: string): CardViewModel {
  const vm = buildCardViewModel(repo, soc);
  if (!vm) throw new Error(`No view model for ${soc}`);
  return vm;
}

export function renderCard(
  vm: CardViewModel,
  status: ZipStatus,
  tier: IncomeTier | null,
  card?: RecommendedCard,
  open = true,
): string {
  return renderToStaticMarkup(
    createElement(CareerCard, {
      card: vm,
      zip: status,
      tier,
      open,
      onToggle() {},
      extras: card ? cardExtras(card) : undefined,
    }),
  );
}

/** Text a person or screen reader gets, with markup and CSS removed. */
export function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export type { QuizResponses };
