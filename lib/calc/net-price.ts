/**
 * Net price by family income tier (CLAUDE.md → Calculation Rules, Beta core).
 *
 * Pure functions over data-repository output; nothing reads the JSON files.
 * Every result carries the source of its value. Nothing is estimated: a
 * missing value stays null with a reason, and no tier ever borrows another
 * tier's figure. A net price at or below zero is a status, never a negative
 * number in `amount`. Income is used only here, after matching, and only as a
 * bracket id (no dollar figure is taken or stored).
 */
import type { DataRepository, InstitutionProgram, InstitutionView } from "@/lib/data/repository";
import { institutionSource, type Source } from "@/lib/data/provenance";
import type { Institution } from "@/lib/data/schemas";

type CostFields = Institution["cost_and_net_price"];
type TierField = Exclude<keyof CostFields, "avg_net_price" | "net_price_flag">;

/** The five Scorecard family-income brackets. */
export const INCOME_TIERS = {
  1: { label: "$0–30,000", field: "net_price_tier1_0_30k" },
  2: { label: "$30,001–48,000", field: "net_price_tier2_30_48k" },
  3: { label: "$48,001–75,000", field: "net_price_tier3_48_75k" },
  4: { label: "$75,001–110,000", field: "net_price_tier4_75_110k" },
  5: { label: "$110,001 and up", field: "net_price_tier5_110k_plus" },
} as const satisfies Record<number, { label: string; field: TierField }>;

export type IncomeTier = keyof typeof INCOME_TIERS;

export const NET_GRANT_SURPLUS_LABEL = "Net grant surplus / zero net tuition";
export const NOT_APPLICABLE_LABEL = "Not applicable (paid apprenticeship)";
export const OVERALL_AVERAGE_LABEL = "average for all aided students, any income";
export const PUBLIC_RESIDENCY_NOTE = "in-state students; out-of-state costs are higher";
export const MISSING_BADGE = "Net price not reported";
export const PER_YEAR = "per year";

const APPRENTICESHIP_FLAG: CostFields["net_price_flag"] = "Not applicable (paid registered apprenticeship)";

interface NetPriceBase {
  record_id: string;
  provider_name: string;
  /** The tier asked for; null means none was selected (overall average). */
  tier: IncomeTier | null;
  /** Set for public schools on every result; null otherwise. */
  residency_note: typeof PUBLIC_RESIDENCY_NOTE | null;
  /** Where the value came from; null when the record has no provenance for it (show the badge). */
  source: Source | null;
}

export type NetPriceResult =
  | (NetPriceBase & {
      status: "amount";
      amount: number;
      period: typeof PER_YEAR;
      label: string;
    })
  | (NetPriceBase & {
      status: "overall_average";
      amount: number;
      period: typeof PER_YEAR;
      label: typeof OVERALL_AVERAGE_LABEL;
    })
  | (NetPriceBase & {
      status: "net_grant_surplus";
      /** The published figure (≤ 0), kept for tracing to the source row. Not for display. */
      reported_value: number;
      period: typeof PER_YEAR;
      label: typeof NET_GRANT_SURPLUS_LABEL;
    })
  | (NetPriceBase & {
      status: "not_applicable";
      label: typeof NOT_APPLICABLE_LABEL;
    })
  | (NetPriceBase & {
      status: "missing";
      amount: null;
      reason: "tier_not_reported" | "average_not_reported";
      badge: typeof MISSING_BADGE;
    });

/** Tier label for a result card, e.g. "per year, family income $0–30,000: average for aided students, not a personal quote". */
function tierLabel(tier: IncomeTier): string {
  return `${PER_YEAR}, family income ${INCOME_TIERS[tier].label}: average for aided students, not a personal quote`;
}

/**
 * Net price from cost_and_net_price.net_price_tier{1–5}_* (or avg_net_price when tier is null), net_price_flag, control and provenance.cost_and_net_price (provenance.apprenticeship for sponsors).
 */
export function netPriceForTier(view: InstitutionView, tier: IncomeTier | null): NetPriceResult {
  const inst = view.institution;
  const cost = inst.cost_and_net_price;
  const base = {
    record_id: inst.record_id,
    provider_name: inst.name,
    tier,
    residency_note: inst.control === "Public" ? PUBLIC_RESIDENCY_NOTE : null,
  } as const;

  // Paid apprenticeships have no tuition to price; checked first so a sponsor is never "missing".
  if (cost.net_price_flag === APPRENTICESHIP_FLAG) {
    return { ...base, status: "not_applicable", label: NOT_APPLICABLE_LABEL, source: institutionSource(inst, "apprenticeship") };
  }

  const source = institutionSource(inst, "cost_and_net_price");
  const value = tier === null ? cost.avg_net_price : cost[INCOME_TIERS[tier].field];

  if (value === null) {
    return {
      ...base,
      status: "missing",
      amount: null,
      reason: tier === null ? "average_not_reported" : "tier_not_reported",
      badge: MISSING_BADGE,
      source,
    };
  }
  if (value <= 0) {
    return { ...base, status: "net_grant_surplus", reported_value: value, period: PER_YEAR, label: NET_GRANT_SURPLUS_LABEL, source };
  }
  if (tier === null) {
    return { ...base, status: "overall_average", amount: value, period: PER_YEAR, label: OVERALL_AVERAGE_LABEL, source };
  }
  return { ...base, status: "amount", amount: value, period: PER_YEAR, label: tierLabel(tier), source };
}

export interface ProgramNetPrice {
  program: InstitutionProgram;
  net_price: NetPriceResult;
}

/**
 * Net price for each confirmed local program from programsForOccupation(soc).confirmed, via getInstitution(record_id).cost_and_net_price; null for an unknown SOC.
 */
export function netPricesForOccupation(
  repo: DataRepository,
  soc: string,
  tier: IncomeTier | null,
): ProgramNetPrice[] | null {
  const programs = repo.programsForOccupation(soc);
  if (!programs) return null;
  return programs.confirmed.flatMap((program) => {
    const view = repo.getInstitution(program.record_id);
    return view ? [{ program, net_price: netPriceForTier(view, tier) }] : [];
  });
}
