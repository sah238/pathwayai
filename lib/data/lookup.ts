/**
 * Small lookups the career card needs. Every value comes back with its
 * data_vintage and source_url (CLAUDE.md rule 7).
 */
import type { DmvState } from "./constants";
import type { Institution, Occupation, OccupationsFile } from "./schemas";

// ---------------------------------------------------------------------------
// Institution provenance
// ---------------------------------------------------------------------------

export type ProvenanceSection = "admissions" | "cost_and_net_price" | "outcomes_and_debt" | "apprenticeship";

export interface Source {
  source: string;
  data_vintage: string | null;
  source_url: string;
}

/**
 * Source for one section of an institution record, taken from the record's own
 * `provenance` object. It never falls back to `metadata.field_sources`: when a
 * record has no provenance for the section, the answer is null (show the
 * missing-data badge).
 */
export function institutionSource(inst: Institution, section: ProvenanceSection): Source | null {
  const p = inst.provenance[section];
  if (!p) return null;
  return { source: p.source, data_vintage: p.data_vintage ?? null, source_url: p.source_url };
}

// ---------------------------------------------------------------------------
// Wages: state percentiles when they exist, else national
// ---------------------------------------------------------------------------

export interface WagePercentiles {
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

export interface WageLookup {
  scope: "state" | "national";
  /** State the student asked for (null when no ZIP or outside DC/MD/VA). */
  requested_state: DmvState | null;
  percentiles: WagePercentiles;
  /** State employment; null when not published. Always null for national. */
  employment: number | null;
  /** Set when the card must show a badge: national fallback, or missing employment. */
  badge: "National wages shown" | "Employment not published" | null;
  data_vintage: string | null;
  source_url: string | null;
}

/**
 * Wage percentiles for an occupation. Uses the state's percentiles whenever all
 * five exist, even if that state's employment is null. Falls back to national
 * wages only when the state row is missing or any percentile is null.
 */
export function wagesFor(
  occ: Occupation,
  state: DmvState | null,
  fieldSources: OccupationsFile["metadata"]["field_sources"],
): WageLookup {
  const row = state ? occ.state_wages_2025[state] : undefined;
  if (
    row &&
    row.wage_10th !== null &&
    row.wage_25th !== null &&
    row.median_wage !== null &&
    row.wage_75th !== null &&
    row.wage_90th !== null
  ) {
    const src = fieldSources["state_wages_2025"];
    return {
      scope: "state",
      requested_state: state,
      percentiles: { p10: row.wage_10th, p25: row.wage_25th, median: row.median_wage, p75: row.wage_75th, p90: row.wage_90th },
      employment: row.employment,
      badge: row.employment === null ? "Employment not published" : null,
      data_vintage: src?.data_vintage ?? null,
      source_url: src?.source_url ?? null,
    };
  }
  const n = occ.national_wages_2025;
  const src = fieldSources["national_wages_2025"];
  return {
    scope: "national",
    requested_state: state,
    percentiles: { p10: n.entry_10th, p25: n.entry_25th, median: n.median_50th, p75: n.experienced_75th, p90: n.top_90th },
    employment: null,
    badge: state ? "National wages shown" : null,
    data_vintage: src?.data_vintage ?? null,
    source_url: src?.source_url ?? null,
  };
}
