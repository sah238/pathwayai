/**
 * Server-side view-models for the Glance layer (CLAUDE.md → Career Card Layers,
 * factors 1–4). Every option the student can pick in the browser is
 * precomputed here: wages for national, DC, MD, VA and "outside the region",
 * and net prices for income tiers 1–5 plus the overall average. The browser
 * only chooses among these values (see ./select.ts); it never computes one.
 *
 * Every value comes from the data repository or lib/calc, with its Source.
 * Nothing here reads the JSON files.
 */
import { netPricesForOccupation, type IncomeTier, type NetPriceResult } from "@/lib/calc";
import { DMV_STATES, Q4_OPTIONS, type DmvState } from "@/lib/data/constants";
import type { WageLookup, WagePercentiles } from "@/lib/data/lookup";
import type { Source } from "@/lib/data/provenance";
import type { DataRepository, InstitutionProgram } from "@/lib/data/repository";
import type { Institution, Occupation } from "@/lib/data/schemas";

export interface Sourced<T> {
  value: T;
  /** Null when the dataset lists no source for it; the card shows a badge. */
  source: Source | null;
}

/** "outside_region": a ZIP was entered but is not in DC, MD or VA. */
export type WageKey = "national" | "outside_region" | DmvState;

export const SMALL_SAMPLE_BADGE = "Small sample";

export interface WageView extends WageLookup {
  /** Source of the percentiles shown (state_wages_2025 or national_wages_2025). */
  source: Source | null;
  /** Percentiles the dataset flags as resting on a small sample. */
  small_sample: (keyof WagePercentiles)[];
  /** Source of the small-sample flags (data_quality_flags). */
  small_sample_source: Source | null;
}

/** "overall" = no tier picked (prefer not to say): avg_net_price. */
export type NetPriceKey = "overall" | `${IncomeTier}`;
export const NET_PRICE_KEYS = ["overall", "1", "2", "3", "4", "5"] as const satisfies readonly NetPriceKey[];

export interface ProgramView {
  record_id: string;
  provider_name: string;
  city: string;
  state: string;
  provider_type: Institution["provider_type"];
  program_title: string;
  credential: InstitutionProgram["program"]["credential"];
  is_apprenticeship: boolean;
  /** Sponsors only: states the apprenticeship is registered in. */
  registered_in: DmvState[];
  /** Sponsors only. */
  program_length_years: Sourced<number> | null;
  program_source: Source | null;
  net_price: Record<NetPriceKey, NetPriceResult>;
}

export type RewardsView =
  | { status: "rated"; labels: string[]; source: Source | null }
  | { status: "not_rated"; badge: typeof NOT_RATED_BADGE; reason: string | null; source: Source | null };

export const NOT_RATED_BADGE = "Not rated by O*NET";
export const NO_LOCAL_PROGRAM_BADGE = "No local program found";

export interface CardViewModel {
  soc: string;
  title: Sourced<string>;
  /** Factor 1: first 3 core tasks (Claude summarizes these later). */
  tasks: Sourced<string[]>;
  /** Factor 2 (beta): the career's top two O*NET Work Values as Q4 labels. */
  rewards: RewardsView;
  /** Factor 3. */
  wages: Record<WageKey, WageView>;
  /** Factor 4. */
  path: {
    entry_education: Sourced<string>;
    job_zone_label: Sourced<string>;
    training_pathway: Sourced<string>;
    /** True when the typical path is a registered apprenticeship or a local sponsor offers one. */
    apprenticeship_option: boolean;
    /** Confirmed local programs only (unconfirmed ones are not shown as local options). */
    programs: ProgramView[];
    /** Shown with NO_LOCAL_PROGRAM_BADGE when programs is empty. */
    national_route: Sourced<string[]>;
  };
}

const PERCENTILE_FIELDS: Record<string, keyof WagePercentiles> = {
  wage_10th: "p10",
  wage_25th: "p25",
  median_wage: "median",
  wage_75th: "p75",
  wage_90th: "p90",
};

/** Percentiles flagged "small" in data_quality_flags, e.g. state_wages_2025.DC.wage_90th. */
function smallSampleFields(occ: Occupation, state: DmvState): (keyof WagePercentiles)[] {
  const out = new Set<keyof WagePercentiles>();
  for (const flag of occ.data_quality_flags) {
    if (!/small/i.test(flag.issue)) continue;
    for (const field of flag.field.split(",").map((f) => f.trim())) {
      const m = /^state_wages_2025\.([A-Z]{2})\.(\w+)$/.exec(field);
      const key = m && m[1] === state ? PERCENTILE_FIELDS[m[2]] : undefined;
      if (key) out.add(key);
    }
  }
  return [...out];
}

function wageViews(repo: DataRepository, occ: Occupation): Record<WageKey, WageView> {
  const flagSource = repo.occupationSource("data_quality_flags");
  const toView = (lookup: WageLookup): WageView => {
    const stateScoped = lookup.scope === "state" && lookup.requested_state !== null;
    return {
      ...lookup,
      source: repo.occupationSource(stateScoped ? "state_wages_2025" : "national_wages_2025"),
      small_sample: stateScoped ? smallSampleFields(occ, lookup.requested_state!) : [],
      small_sample_source: stateScoped ? flagSource : null,
    };
  };
  const national = toView(repo.getAreaWages(occ.soc_code, null)!);
  const byState = Object.fromEntries(
    DMV_STATES.map((s) => [s, toView(repo.getAreaWages(occ.soc_code, s)!)]),
  ) as Record<DmvState, WageView>;
  return {
    national,
    // getAreaWages(soc, null) has no badge, but a student who entered a ZIP
    // outside DC/MD/VA must see that the figures are national.
    outside_region: { ...national, badge: "National wages shown" },
    ...byState,
  };
}

function rewardsView(repo: DataRepository, occ: Occupation): RewardsView {
  const source = repo.occupationSource("work_values");
  if (!occ.work_values) {
    const flag = occ.data_quality_flags.find((f) => f.field === "work_values");
    return { status: "not_rated", badge: NOT_RATED_BADGE, reason: flag?.issue ?? null, source };
  }
  const labels = occ.work_values.high_points
    .slice(0, 2)
    .map((v) => Q4_OPTIONS.find((o) => o.value === v)?.label)
    .filter((l): l is NonNullable<typeof l> => !!l);
  return { status: "rated", labels, source };
}

function programViews(repo: DataRepository, soc: string): ProgramView[] {
  const byKey = Object.fromEntries(
    NET_PRICE_KEYS.map((k) => [k, netPricesForOccupation(repo, soc, k === "overall" ? null : (Number(k) as IncomeTier)) ?? []]),
  ) as Record<NetPriceKey, NonNullable<ReturnType<typeof netPricesForOccupation>>>;

  return byKey.overall.map(({ program }, i) => {
    const net_price = Object.fromEntries(
      NET_PRICE_KEYS.map((k) => {
        const row = byKey[k][i];
        // Same repository call, same order; guard anyway so a tier never shows another school's price.
        if (!row || row.program.record_id !== program.record_id || row.program.program.title !== program.program.title) {
          throw new Error(`Net price rows out of order for ${soc} (${k})`);
        }
        return [k, row.net_price];
      }),
    ) as Record<NetPriceKey, NetPriceResult>;
    const isAppr = program.program.credential === "Registered apprenticeship";
    return {
      record_id: program.record_id,
      provider_name: program.provider_name,
      city: program.location.city,
      state: program.location.state,
      provider_type: program.provider_type,
      program_title: program.program.title,
      credential: program.program.credential,
      is_apprenticeship: isAppr,
      registered_in: isAppr ? (program.apprenticeship?.registered_in ?? []) : [],
      program_length_years:
        isAppr && program.apprenticeship
          ? { value: program.apprenticeship.program_length_years, source: program.sources.apprenticeship }
          : null,
      program_source: program.sources.program,
      net_price,
    };
  });
}

/** Glance-layer view-model for one career; null for an unknown SOC. */
export function buildCardViewModel(repo: DataRepository, soc: string): CardViewModel | null {
  const occ = repo.getOccupation(soc);
  if (!occ) return null;
  const src = (path: string) => repo.occupationSource(path);
  const edu = occ.education_and_training;
  const programs = programViews(repo, soc);

  return {
    soc,
    title: { value: occ.career_title, source: src("career_title") },
    tasks: { value: occ.core_tasks.slice(0, 3), source: src("core_tasks") },
    rewards: rewardsView(repo, occ),
    wages: wageViews(repo, occ),
    path: {
      entry_education: { value: edu.entry_education, source: src("education_and_training.entry_education") },
      job_zone_label: { value: edu.job_zone_label, source: src("education_and_training.job_zone_label") },
      training_pathway: { value: edu.training_pathway, source: src("education_and_training.training_pathway") },
      apprenticeship_option:
        edu.training_pathway === "Registered Apprenticeship" || programs.some((p) => p.is_apprenticeship),
      programs,
      national_route: {
        value: occ.cip_routing.related_programs.map((p) => p.title),
        source: src("cip_routing.related_programs"),
      },
    },
  };
}
