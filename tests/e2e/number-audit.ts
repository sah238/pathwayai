/**
 * Traces displayed numbers back to the repository. The ledger is built from
 * repository calls and the raw records, not from the card view-model, so a
 * view-model bug cannot vouch for itself.
 */
import type { ZipStatus } from "@/app/results/select";
import type { CardViewModel } from "@/app/results/view-model";
import { signedPct, thousands, usd } from "@/components/cards/format";
import { INCOME_TIERS, MISSING_BADGE, type IncomeTier } from "@/lib/calc/net-price";
import { institutionSource, type Source } from "@/lib/data/provenance";
import { repo } from "./harness";

export interface LedgerEntry {
  token: string;
  path: string;
  source: Source | null;
}

export interface Ledger {
  entries: LedgerEntry[];
  /** Confirmed programs whose net price is null in this view. */
  missingNetPrices: number;
  employmentMissing: boolean;
}

const unsigned = (s: string) => s.replace(/^[+−]/, "");

export function buildLedger(soc: string, status: ZipStatus, tier: IncomeTier | null): Ledger {
  const occ = repo.getOccupation(soc);
  const state = status.kind === "state" ? status.state : null;
  const wages = repo.getAreaWages(soc, state);
  const programs = repo.programsForOccupation(soc);
  if (!occ || !wages || !programs) throw new Error(`Unknown SOC ${soc}`);

  const entries: LedgerEntry[] = [];
  const wagePath = wages.scope === "state" ? `state_wages_2025.${state}` : "national_wages_2025";
  const wageSource = repo.occupationSource(wages.scope === "state" ? "state_wages_2025" : "national_wages_2025");
  for (const key of ["p10", "p25", "median", "p90"] as const) {
    entries.push({ token: usd.format(wages.percentiles[key]), path: `${soc}.${wagePath}.${key}`, source: wageSource });
  }
  if (wages.scope === "state" && wages.employment !== null) {
    entries.push({
      token: wages.employment.toLocaleString("en-US"),
      path: `${soc}.${wagePath}.employment`,
      source: wageSource,
    });
  }

  const proj = occ.projections_2025_2035;
  const projSource = repo.occupationSource("projections_2025_2035");
  entries.push(
    { token: unsigned(signedPct(proj.job_growth_pct)), path: `${soc}.projections.job_growth_pct`, source: projSource },
    { token: thousands(proj.job_change_k), path: `${soc}.projections.job_change_k`, source: projSource },
    { token: thousands(proj.annual_openings_k), path: `${soc}.projections.annual_openings_k`, source: projSource },
  );

  let missingNetPrices = 0;
  for (const program of programs.confirmed) {
    const view = repo.getInstitution(program.record_id);
    if (!view) throw new Error(`Unknown institution ${program.record_id}`);
    const inst = view.institution;
    const cost = inst.cost_and_net_price;
    if (program.program.credential === "Registered apprenticeship" && inst.apprenticeship) {
      entries.push({
        token: String(inst.apprenticeship.program_length_years),
        path: `${inst.record_id}.apprenticeship.program_length_years`,
        source: institutionSource(inst, "apprenticeship"),
      });
    }
    if (cost.net_price_flag === "Not applicable (paid registered apprenticeship)") continue;
    const field = tier === null ? "avg_net_price" : INCOME_TIERS[tier].field;
    const value = cost[field];
    if (value === null) missingNetPrices++;
    else if (value > 0) {
      entries.push({
        token: usd.format(value),
        path: `${inst.record_id}.cost_and_net_price.${field}`,
        source: institutionSource(inst, "cost_and_net_price"),
      });
    }
  }

  return {
    entries,
    missingNetPrices,
    employmentMissing: wages.scope === "state" && wages.employment === null,
  };
}

/** Dataset and fixed text that may contain digits but is not a statistic. */
function descriptiveText(vm: CardViewModel): string[] {
  const sources: (Source | null | undefined)[] = [
    vm.title.source,
    vm.tasks.source,
    vm.rewards.source,
    vm.path.entry_education.source,
    vm.path.job_zone_label.source,
    vm.path.training_pathway.source,
    vm.path.national_route.source,
    vm.expand.could_i.first_step.pathway.source,
    vm.expand.work_environment.source,
    vm.expand.outlook.source,
    vm.expand.outlook.ai_exposure_tier.source,
    vm.expand.outlook.early_career?.source,
    ...Object.values(vm.wages).flatMap((w) => [w.source, w.small_sample_source]),
    ...vm.path.programs.flatMap((p) => [
      p.program_source,
      p.program_length_years?.source,
      ...Object.values(p.net_price).map((n) => n.source),
    ]),
  ];
  return [
    vm.title.value,
    ...vm.tasks.value,
    vm.path.entry_education.value,
    vm.path.job_zone_label.value,
    vm.path.training_pathway.value,
    ...vm.path.national_route.value,
    vm.expand.could_i.first_step.text,
    ...(vm.expand.outlook.early_career ? [vm.expand.outlook.early_career.reason] : []),
    ...vm.path.programs.flatMap((p) => [p.provider_name, p.city, p.program_title]),
    ...sources.flatMap((s) => (s ? [s.source, s.data_vintage ?? ""] : [])),
    ...Object.values(INCOME_TIERS).map((t) => t.label),
  ].filter(Boolean);
}

const FIXED_UI = [
  /\b(?:10th|25th|90th) percentile\b/g,
  /Jobs, 2025 to 2035/g,
  /\bSOC \d{2}-\d{4}\b/g,
  /(?:^| )(?:[1-9]|10) · /g,
  /Show \d+ more/g,
  /CC BY 4\.0/g,
  /\b[1-4]\. (?=My |Talk |Cost )/g,
];

/** Numeric tokens left after dataset text and fixed UI labels are removed. */
export function numericTokens(text: string, vms: CardViewModel[]): string[] {
  let rest = text;
  const strings = [...new Set(vms.flatMap(descriptiveText))].sort((a, b) => b.length - a.length);
  for (const s of strings) rest = rest.split(s).join(" ");
  for (const pattern of FIXED_UI) rest = rest.replace(pattern, " ");
  return rest.match(/\$?\d[\d,]*(?:\.\d+)?%?/g)?.map((t) => t.replace(/,$/, "")) ?? [];
}

/** Ledger paths whose source has no data_vintage (CLAUDE.md rule 7). */
export function missingVintages(ledger: Ledger): string[] {
  return ledger.entries.filter((e) => !e.source?.data_vintage).map((e) => e.path);
}

/** Problems for one rendered card: untraceable numbers, missing values, or a null shown as 0. */
export function auditCard(label: string, text: string, vm: CardViewModel, ledger: Ledger): string[] {
  const problems: string[] = [];
  const known = new Set(ledger.entries.map((e) => e.token));
  for (const token of numericTokens(text, [vm])) {
    if (!known.has(token)) problems.push(`${label}: "${token}" has no repository value`);
  }
  for (const entry of ledger.entries) {
    if (!text.includes(entry.token)) problems.push(`${label}: ${entry.path} (${entry.token}) is not displayed`);
    // A missing data_vintage is tracked on its own (missingVintages, F4 in the report).
    if (!entry.source?.source || !entry.source.source_url) {
      problems.push(`${label}: ${entry.path} lacks a source`);
    }
  }
  const badges = text.split(MISSING_BADGE).length - 1;
  if (badges !== ledger.missingNetPrices) {
    problems.push(`${label}: ${ledger.missingNetPrices} null net prices but ${badges} badges`);
  }
  if (ledger.employmentMissing && !text.includes("Employment not published")) {
    problems.push(`${label}: null employment has no badge`);
  }
  if (/\$0(?![\d,–])/.test(text)) problems.push(`${label}: shows $0`);
  return problems;
}
