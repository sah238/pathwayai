/**
 * Client-safe selectors: pick which precomputed value a card shows for the
 * ZIP and income bracket the student entered. They choose; they never compute
 * a figure. ZIP and tier live only in React state (no URL, storage or server).
 */
import type { IncomeTier, NetPriceResult } from "@/lib/calc/net-price";
import type { DmvState } from "@/lib/data/constants";
import { zipToState } from "@/lib/data/geo";
import type { Source } from "@/lib/data/provenance";
import type { CardViewModel, NetPriceKey, ProgramView, WageKey, WageView } from "./view-model";

export type ZipStatus =
  | { kind: "none" }
  | { kind: "incomplete" }
  | { kind: "outside_region" }
  | { kind: "state"; state: DmvState };

export function zipStatus(zip: string): ZipStatus {
  const z = zip.trim();
  if (z === "") return { kind: "none" };
  const state = zipToState(z);
  if (state) return { kind: "state", state };
  return /^\d{5}(-\d{4})?$/.test(z) ? { kind: "outside_region" } : { kind: "incomplete" };
}

export function wageKey(status: ZipStatus): WageKey {
  if (status.kind === "state") return status.state;
  if (status.kind === "outside_region") return "outside_region";
  return "national";
}

export function selectWages(card: CardViewModel, status: ZipStatus): WageView {
  return card.wages[wageKey(status)];
}

export function netPriceKey(tier: IncomeTier | null): NetPriceKey {
  return tier === null ? "overall" : (`${tier}` as NetPriceKey);
}

export function selectNetPrice(program: ProgramView, tier: IncomeTier | null): NetPriceResult {
  return program.net_price[netPriceKey(tier)];
}

/** Does this program serve the student's state (located there, or a sponsor registered there)? */
export function servesState(program: ProgramView, state: DmvState): boolean {
  return program.state === state || program.registered_in.includes(state);
}

/**
 * Display order: programs serving the student's state first, then
 * apprenticeships, then by provider name. Order only; no ranking by price.
 */
export function sortPrograms(programs: ProgramView[], status: ZipStatus): ProgramView[] {
  const state = status.kind === "state" ? status.state : null;
  return [...programs].sort((a, b) => {
    if (state) {
      const d = Number(servesState(b, state)) - Number(servesState(a, state));
      if (d) return d;
    }
    const d = Number(b.is_apprenticeship) - Number(a.is_apprenticeship);
    return d || a.provider_name.localeCompare(b.provider_name);
  });
}

/** Every source behind a value on screen, deduplicated, for the vintage banner. */
export function sourcesOnScreen(
  cards: CardViewModel[],
  status: ZipStatus,
  tier: IncomeTier | null,
  /** The card whose Expand layer is open, if any. */
  openSoc: string | null = null,
): Source[] {
  const out = new Map<string, Source>();
  const add = (s: Source | null | undefined) => {
    if (s) out.set(`${s.source}|${s.data_vintage}|${s.source_url}`, s);
  };
  for (const card of cards) {
    add(card.title.source);
    add(card.tasks.source);
    add(card.rewards.source);
    const wages = selectWages(card, status);
    add(wages.source);
    if (wages.small_sample.length) add(wages.small_sample_source);
    add(card.path.entry_education.source);
    add(card.path.job_zone_label.source);
    add(card.path.training_pathway.source);
    if (card.path.programs.length === 0) add(card.path.national_route.source);
    for (const p of card.path.programs) {
      add(p.program_source);
      add(p.program_length_years?.source);
      add(selectNetPrice(p, tier).source);
    }
    if (card.soc === openSoc) {
      const { could_i, work_environment, outlook } = card.expand;
      add(could_i.job_zone_label.source);
      add(could_i.first_step.pathway.source);
      add(work_environment.source);
      add(outlook.source);
      add(outlook.ai_exposure_tier.source);
      add(outlook.early_career?.source);
    }
  }
  return [...out.values()];
}
