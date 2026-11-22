/**
 * Hands the quiz's results to the results page, in browser memory only.
 *
 * A module-level variable: no React provider, no localStorage,
 * sessionStorage, cookies or URL. A page refresh (or opening the link in a
 * new tab) clears it, and the results page then works from the URL's career
 * codes alone, as it did before.
 */
import type { RecommendedCard } from "@/app/api/recommend/types";

export interface RecommendHandoff {
  socs: [string, string, string];
  /** The quiz ZIP, to pre-fill the results ZIP box. Never sent anywhere. */
  zip: string | null;
  cards: [RecommendedCard, RecommendedCard, RecommendedCard];
}

let current: RecommendHandoff | null = null;

export function setHandoff(handoff: RecommendHandoff): void {
  current = handoff;
}

/** The handoff, only if it is for exactly these careers in this order; else null. */
export function getHandoff(socs: readonly string[]): RecommendHandoff | null {
  if (!current) return null;
  return current.socs.length === socs.length && current.socs.every((s, i) => s === socs[i]) ? current : null;
}

export function clearHandoff(): void {
  current = null;
}
