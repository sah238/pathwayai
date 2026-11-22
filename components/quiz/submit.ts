/**
 * Sends the finished quiz to POST /api/recommend and turns the reply into
 * what the finish screen needs. Answers go only in the request body; the
 * results URL carries career codes and nothing else.
 */
import { RecommendResponseSchema, type RecommendedCard } from "@/app/api/recommend/types";
import type { QuizResponses } from "@/lib/quiz/responses";

/** Just under the route's maxDuration (60 s, app/api/recommend/route.ts). */
export const RECOMMEND_TIMEOUT_MS = 55_000;

export type SubmitOutcome =
  | { kind: "cards"; socs: [string, string, string]; cards: [RecommendedCard, RecommendedCard, RecommendedCard] }
  | { kind: "nudge"; message: string }
  | { kind: "error" };

/** The results page link: only the three SOC codes. */
export function resultsUrl(socs: readonly string[]): string {
  return `/results?socs=${socs.map(encodeURIComponent).join(",")}`;
}

export async function submitQuiz(
  responses: QuizResponses,
  fetchFn: typeof fetch = fetch,
  timeoutMs = RECOMMEND_TIMEOUT_MS,
): Promise<SubmitOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(responses),
      signal: controller.signal,
    });
    if (!res.ok) return { kind: "error" };
    const parsed = RecommendResponseSchema.safeParse(await res.json());
    if (!parsed.success) return { kind: "error" };
    const data = parsed.data;
    if (data.kind === "nudge") return { kind: "nudge", message: data.message };
    return { kind: "cards", socs: data.cards.map((c) => c.soc) as [string, string, string], cards: data.cards };
  } catch {
    // Network failure, timeout (abort) or a non-JSON body.
    return { kind: "error" };
  } finally {
    clearTimeout(timer);
  }
}
