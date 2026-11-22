/**
 * Where a value came from (CLAUDE.md rule 7). One place for the rules, shared
 * by the repository and the audit:
 *   - occupation field → metadata.field_sources, the field itself or its nearest parent
 *   - institution section → the record's own `provenance` object (never field_sources)
 *   - institution program → metadata.field_sources.programs (programs have no
 *     per-record provenance; open question)
 */
import type { Institution, InstitutionsFile, OccupationsFile } from "./schemas";

export interface Source {
  source: string;
  data_vintage: string | null;
  source_url: string | null;
}

/**
 * The field_sources key that covers a dotted path: the path itself or its
 * longest ancestor ("state_wages_2025" covers "state_wages_2025.DC.wage_90th").
 * Array indices are ignored.
 */
export function fieldSourceKey(fieldSources: Record<string, unknown>, path: string): string | undefined {
  const p = path.replace(/\[\d+\]/g, "");
  return Object.keys(fieldSources)
    .filter((k) => p === k || p.startsWith(`${k}.`))
    .sort((a, b) => b.length - a.length)[0];
}

/** Source of an occupation field, or null when field_sources doesn't cover it. */
export function occupationSource(
  fieldSources: OccupationsFile["metadata"]["field_sources"],
  path: string,
): Source | null {
  const key = fieldSourceKey(fieldSources, path);
  return key ? { ...fieldSources[key] } : null;
}

export type ProvenanceSection = "admissions" | "cost_and_net_price" | "outcomes_and_debt" | "apprenticeship";

/**
 * Source for one section of an institution record, from the record's own
 * `provenance` object. Never falls back to metadata.field_sources: a missing
 * section returns null (show the missing-data badge).
 */
export function institutionSource(inst: Institution, section: ProvenanceSection): Source | null {
  const p = inst.provenance[section];
  if (!p) return null;
  return { source: p.source, data_vintage: p.data_vintage ?? null, source_url: p.source_url };
}

/** Source for institutions' programs[] (Scorecard Field of Study file). */
export function programSource(fieldSources: InstitutionsFile["metadata"]["field_sources"]): Source {
  return { ...fieldSources.programs };
}
