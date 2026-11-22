/**
 * Data audit checks for data v1.3.0. Pure functions: they take parsed JSON and
 * return findings; scripts/audit-data.ts loads the files and prints the report.
 *
 * Severity:
 *   error – breaks a CLAUDE.md rule or the data contradicts itself
 *   warn  – likely problem nobody has documented yet
 *   known – real gap that is already documented (a record's data_quality_flags,
 *           metadata.known_open_issues, or a team decision that is pending)
 *   info  – context, not a problem
 */
import { DMV_STATES, ONET_WORK_VALUES, Q4_OPTIONS, type DmvState } from "./constants";
import { zipToState } from "./geo";
import { fieldSourceKey } from "./provenance";
import {
  InstitutionsFileSchema,
  OccupationsFileSchema,
  type DataQualityFlag,
  type Institution,
  type InstitutionsFile,
  type Occupation,
  type OccupationsFile,
} from "./schemas";

export type Severity = "error" | "warn" | "known" | "info";
export const SEVERITIES: readonly Severity[] = ["error", "warn", "known", "info"];

export type DataFile = "occupations.json" | "institutions.json" | "fixtures";

export interface Finding {
  check: string;
  severity: Severity;
  file: DataFile;
  /** soc_code, record_id, fixture file name, or "metadata". */
  record: string;
  path: string;
  message: string;
}

/** A student fixture from data/fixtures/ (only the fields the audit reads). */
export interface StudentFixture {
  name: string;
  data: {
    quiz_responses?: {
      q4_values_most_least?: { most_important?: string[]; least_important?: string | null };
      q11_zip_code?: string | null;
    };
  };
}

const OCC: DataFile = "occupations.json";
const INST: DataFile = "institutions.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * True when one of the record's data_quality_flags documents `path`: the flag
 * names the path itself or one of its ancestors ("state_wages_2025" covers
 * "state_wages_2025.DC"). A flag may list several fields separated by ", ".
 */
export function isFlagged(flags: readonly DataQualityFlag[] | undefined, path: string): boolean {
  return (flags ?? []).some((f) =>
    f.field
      .split(",")
      .map((s) => s.trim())
      .some((field) => path === field || path.startsWith(`${field}.`)),
  );
}

/** Every leaf (non-object, non-array value) with its dotted path; array indices as [n]. */
export function leaves(value: unknown, path = ""): Array<{ path: string; value: unknown }> {
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path, value }];
    return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return [{ path, value }];
    return entries.flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [{ path, value }];
}

const stripIndices = (path: string) => path.replace(/\[\d+\]/g, "");

// ---------------------------------------------------------------------------
// 1. Schema
// ---------------------------------------------------------------------------

export function checkSchema(occFile: unknown, instFile: unknown): Finding[] {
  const out: Finding[] = [];
  const run = (file: DataFile, result: ReturnType<typeof OccupationsFileSchema.safeParse> | ReturnType<typeof InstitutionsFileSchema.safeParse>, raw: unknown) => {
    if (result.success) return;
    for (const issue of result.error.issues) {
      const [top, index] = issue.path;
      let record = "metadata";
      if ((top === "occupations" || top === "institutions") && typeof index === "number") {
        const arr = (raw as Record<string, unknown[]>)[top];
        const rec = arr?.[index] as Record<string, unknown> | undefined;
        record = String(rec?.soc_code ?? rec?.record_id ?? `#${index}`);
      }
      out.push({
        check: "schema",
        severity: "error",
        file,
        record,
        path: issue.path.join("."),
        message: issue.message,
      });
    }
  };
  run(OCC, OccupationsFileSchema.safeParse(occFile), occFile);
  run(INST, InstitutionsFileSchema.safeParse(instFile), instFile);
  return out;
}

// ---------------------------------------------------------------------------
// 2. Region (DC/MD/VA only)
// ---------------------------------------------------------------------------

const isDmv = (s: string): s is DmvState => (DMV_STATES as readonly string[]).includes(s);
const WAGE_PERCENTILES = ["wage_10th", "wage_25th", "median_wage", "wage_75th", "wage_90th"] as const;
const WAGE_FIELDS = ["employment", ...WAGE_PERCENTILES] as const;

export function checkRegion(
  occs: Occupation[],
  insts: Institution[],
  fixtures: StudentFixture[] = [],
): Finding[] {
  const out: Finding[] = [];
  const f = (severity: Severity, file: DataFile, record: string, path: string, message: string) =>
    out.push({ check: "region", severity, file, record, path, message });

  for (const inst of insts) {
    const { state, zip5 } = inst.location;
    if (!isDmv(state)) {
      f("error", INST, inst.record_id, "location.state", `${inst.name} is in ${state}, outside DC/MD/VA`);
    }
    const zipState = zipToState(zip5);
    if (zipState !== state) {
      f(
        "error",
        INST,
        inst.record_id,
        "location.zip5",
        `ZIP ${zip5} maps to ${zipState ?? "outside DC/MD/VA"} but location.state is ${state}`,
      );
    }
  }

  for (const occ of occs) {
    for (const key of Object.keys(occ.state_wages_2025)) {
      if (!isDmv(key)) {
        f("error", OCC, occ.soc_code, `state_wages_2025.${key}`, `State wage row for ${key}, outside DC/MD/VA`);
      }
    }
    for (const st of DMV_STATES) {
      const row = occ.state_wages_2025[st];
      const coverage = occ.dmv_wage_coverage?.[st];
      const nullFields = row ? WAGE_FIELDS.filter((k) => row[k] === null) : [...WAGE_FIELDS];
      const complete = nullFields.length === 0;
      const path = `state_wages_2025.${st}`;
      if (coverage === "yes" && !complete) {
        f(
          "error",
          OCC,
          occ.soc_code,
          path,
          row
            ? `dmv_wage_coverage.${st} is "yes" but ${nullFields.join(", ")} null`
            : `dmv_wage_coverage.${st} is "yes" but there is no ${st} wage row`,
        );
      } else if (coverage !== "yes" && complete) {
        f("warn", OCC, occ.soc_code, path, `dmv_wage_coverage.${st} is "${coverage}" but the ${st} row is complete`);
      } else if (!complete) {
        const wagesPresent = !!row && WAGE_PERCENTILES.every((k) => row[k] !== null);
        const what = row ? `${nullFields.join(", ")} null` : "no row";
        const effect = wagesPresent
          ? `Card shows ${st} wages; ${nullFields.join(", ")} not shown.`
          : "Card falls back to national wages with a badge.";
        const flagged = isFlagged(occ.data_quality_flags, path);
        f(
          "known",
          OCC,
          occ.soc_code,
          path,
          `${st}: ${what} (dmv_wage_coverage "${coverage}"${flagged ? "; data_quality_flag" : ""}). ${effect}`,
        );
      }
    }
  }

  for (const fx of fixtures) {
    const zip = fx.data.quiz_responses?.q11_zip_code;
    if (zip && zipToState(zip) === null) {
      f("info", "fixtures", fx.name, "quiz_responses.q11_zip_code", `ZIP ${zip} is outside DC/MD/VA (or malformed)`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Zeros where null is more likely
// ---------------------------------------------------------------------------

/** Leaf names where 0 is implausible as a real value. completers_2yr is check 6. */
const ZERO_SUSPECT = /(rate|wage|price|debt|earnings|employment_20\d\d_k|annual_openings|_10th|_25th|_50th|_75th|_90th|^employment$)/;

export function checkZeros(occs: Occupation[], insts: Institution[]): Finding[] {
  const out: Finding[] = [];
  const scan = (file: DataFile, record: string, rec: object, flags: DataQualityFlag[], cdrDisplay?: boolean) => {
    for (const { path, value } of leaves(rec)) {
      if (value !== 0) continue;
      const leaf = stripIndices(path).split(".").pop() ?? "";
      if (!ZERO_SUSPECT.test(leaf)) continue;
      if (leaf === "cohort_default_rate_3yr") {
        out.push({
          check: "zeros",
          severity: cdrDisplay === false ? "known" : "warn",
          file,
          record,
          path,
          message:
            cdrDisplay === false
              ? "0.0 is the real pandemic-era CDR; handled (cohort_default_rate_display is false)"
              : "0.0 CDR is set to display; it says nothing about repayment risk",
        });
        continue;
      }
      out.push({
        check: "zeros",
        severity: isFlagged(flags, stripIndices(path)) ? "known" : "warn",
        file,
        record,
        path,
        message: "Value is 0; should this be null (missing) instead?",
      });
    }
  };
  for (const o of occs) scan(OCC, o.soc_code, o, o.data_quality_flags);
  for (const i of insts) {
    scan(INST, i.record_id, i, i.data_quality_flags, i.outcomes_and_debt.cohort_default_rate_display);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4. Beta-core career card fields
// ---------------------------------------------------------------------------

export type CardStatus = "present" | "partial" | "absent" | "deferred";

export interface CardRow {
  factor: string;
  item: string;
  status: CardStatus;
  /** "n/total" for counted rows. */
  coverage?: string;
  note?: string;
}

export function checkCardFields(
  occs: Occupation[],
  insts: Institution[],
): { rows: CardRow[]; findings: Finding[] } {
  const rows: CardRow[] = [];
  const findings: Finding[] = [];

  /** Count records passing `ok`; emit a finding per failing record (known if flagged). */
  const count = <T>(
    factor: string,
    item: string,
    records: T[],
    ok: (r: T) => boolean,
    id: (r: T) => string,
    opts: { file: DataFile; flagPath: string; flags: (r: T) => DataQualityFlag[]; note?: string },
  ) => {
    const failing = records.filter((r) => !ok(r));
    const n = records.length - failing.length;
    const status: CardStatus = failing.length === 0 ? "present" : n === 0 ? "absent" : "partial";
    const allKnown = failing.every((r) => isFlagged(opts.flags(r), opts.flagPath));
    rows.push({
      factor,
      item,
      status,
      coverage: `${n}/${records.length}`,
      note: failing.length
        ? `${allKnown ? "known gap" : "gap"}: ${failing.map(id).join(", ")}${opts.note ? `. ${opts.note}` : ""}`
        : opts.note,
    });
    for (const r of failing) {
      findings.push({
        check: "card-fields",
        severity: isFlagged(opts.flags(r), opts.flagPath) ? "known" : "warn",
        file: opts.file,
        record: id(r),
        path: opts.flagPath,
        message: `${factor} · ${item}: missing`,
      });
    }
  };
  const occ = <T extends Occupation>(flagPath: string, note?: string) => ({
    file: OCC,
    flagPath,
    flags: (r: T) => r.data_quality_flags,
    note,
  });
  const soc = (r: Occupation) => r.soc_code;

  count("F1 A day in this job", "core_tasks", occs, (r) => r.core_tasks.length > 0, soc, occ("core_tasks"));

  count("F2 Why it fits you", "work_values (6 O*NET scores)", occs, (r) => r.work_values !== null, soc, occ("work_values"));
  rows.push({
    factor: "F2 Why it fits you",
    item: "work_values.curiosity (Q4)",
    status: "absent",
    coverage: `0/${occs.length}`,
    note: "known: pending team decision (values-quiz.md open question)",
  });

  const nat = (r: Occupation) =>
    Object.entries(r.national_wages_2025).every(([k, v]) => k === "geography_scope" || typeof v === "number");
  count("F3 Pay", "national wages (10/25/50/75/90)", occs, nat, soc, occ("national_wages_2025"));
  // Every occupation × DC/MD/VA pair falls in exactly one bucket.
  const stateRows = occs.flatMap((o) => DMV_STATES.map((st) => ({ o, st, row: o.state_wages_2025[st] })));
  const label = ({ o, st }: { o: Occupation; st: DmvState }) => `${o.soc_code} ${st}`;
  const noRow = stateRows.filter((x) => !x.row);
  const wagesNull = stateRows.filter((x) => x.row && WAGE_PERCENTILES.some((k) => x.row![k] === null));
  const otherNull = stateRows.filter(
    (x) => x.row && !wagesNull.includes(x) && WAGE_FIELDS.some((k) => x.row![k] === null),
  );
  const withWages = stateRows.length - noRow.length - wagesNull.length;
  const gaps = [
    noRow.length && `${noRow.length} no row: ${noRow.map(label).join(", ")}`,
    wagesNull.length && `${wagesNull.length} wages null: ${wagesNull.map(label).join(", ")}`,
    otherNull.length && `${otherNull.length} wages present, employment null: ${otherNull.map(label).join(", ")}`,
  ].filter(Boolean);
  rows.push({
    factor: "F3 Pay",
    item: "DC/MD/VA state wage percentiles",
    status: withWages === stateRows.length ? "present" : withWages === 0 ? "absent" : "partial",
    coverage: `${withWages}/${stateRows.length} occupation×state`,
    note: gaps.length ? `known gap (dmv_wage_coverage). ${gaps.join("; ")}` : undefined,
  });
  rows.push({
    factor: "F3 Pay",
    item: "metro wages",
    status: "deferred",
    note: "beta uses ZIP prefix → state wages, then national",
  });

  count("F4 Path to get there", "entry_education", occs, (r) => !!r.education_and_training.entry_education, soc, occ("education_and_training.entry_education"));
  count("F4 Path to get there", "job_zone", occs, (r) => Number.isInteger(r.education_and_training.job_zone), soc, occ("education_and_training.job_zone"));
  const sponsorSocs = new Set(insts.flatMap((i) => i.apprenticeship?.related_soc_codes ?? []));
  const apprOccs = occs.filter(
    (o) =>
      o.education_and_training.training_pathway === "Registered Apprenticeship" ||
      o.education_and_training.bls_ojt_category === "Apprenticeship",
  );
  count(
    "F4 Path to get there",
    "apprenticeship option has a DMV sponsor",
    apprOccs,
    (r) => sponsorSocs.has(r.soc_code),
    soc,
    occ("cip_routing.dmv_providers", `${apprOccs.length} careers list apprenticeship as the path`),
  );
  const titleIV = insts.filter((i) => i.provider_type === "Title IV institution");
  const tiers = ["net_price_tier1_0_30k", "net_price_tier2_30_48k", "net_price_tier3_48_75k", "net_price_tier4_75_110k", "net_price_tier5_110k_plus"] as const;
  count(
    "F4 Path to get there",
    "net price tiers 1–5 (Title IV)",
    titleIV,
    (i) => tiers.every((t) => i.cost_and_net_price[t] !== null),
    (i) => i.record_id,
    {
      file: INST,
      flagPath: "cost_and_net_price",
      flags: (i) => i.data_quality_flags,
      note: `apprenticeship sponsors: ${insts.length - titleIV.length}, net price "Not applicable" by design`,
    },
  );
  count("F4 Path to get there", "local providers (dmv_providers)", occs, (r) => r.cip_routing.dmv_providers.length > 0, soc, occ("cip_routing.dmv_providers"));

  count("F5 Could I do this?", "job_zone (first step from high school)", occs, (r) => Number.isInteger(r.education_and_training.job_zone), soc, occ("education_and_training.job_zone"));

  count("F8 Work environment", "work_environment labels", occs, (r) => r.work_profile.work_environment !== null, soc, occ("work_profile.work_environment"));
  const envHas = (labels: string[]) => (r: Occupation) =>
    (r.work_profile.work_environment ?? []).some((l) => labels.includes(l));
  const loaded = occs.filter((o) => o.work_profile.work_environment !== null);
  rows.push({
    factor: "F8 Work environment",
    item: "indoor/outdoor · physical/desk · public contact",
    status: "present",
    coverage: `${loaded.filter(envHas(["Indoors", "Outdoors"])).length} · ${loaded.filter(envHas(["Physical/Active", "Desk/Seated"])).length} · ${loaded.filter(envHas(["High Public Contact"])).length} of ${loaded.length}`,
    note: "label lists: a missing label means not tagged, not 'no'. Derivation rules not recorded (field_sources)",
  });

  count(
    "F9 Outlook and AI",
    "growth, openings, AI tier",
    occs,
    (r) =>
      typeof r.projections_2025_2035.job_growth_pct === "number" &&
      typeof r.projections_2025_2035.annual_openings_k === "number" &&
      !!r.projections_2025_2035.ai_exposure_tier,
    soc,
    occ("projections_2025_2035"),
  );
  const earlyCareer = occs.filter(
    (o) =>
      ["High", "Very high"].includes(o.projections_2025_2035.ai_exposure_tier) &&
      ["Bachelor's degree", "Master's degree", "Doctoral or professional degree"].includes(o.education_and_training.entry_education),
  );
  rows.push({
    factor: "F9 Outlook and AI",
    item: "early-career caution inputs (tier + entry education)",
    status: "present",
    coverage: `${occs.length}/${occs.length}`,
    note: `flag would show on ${earlyCareer.length}: ${earlyCareer.map(soc).join(", ")}`,
  });

  rows.push({ factor: "F10 Location", item: "ZIP → state (prefix rule, lib/data/geo.ts)", status: "present" });
  rows.push({ factor: "F10 Location", item: "ZIP → metro (zip_cbsa.json)", status: "deferred" });

  return { rows, findings };
}

// ---------------------------------------------------------------------------
// 5. Provenance (metadata.field_sources + institution provenance)
// ---------------------------------------------------------------------------

export function checkProvenance(occFile: OccupationsFile, instFile: InstitutionsFile): Finding[] {
  const out: Finding[] = [];
  const f = (severity: Severity, file: DataFile, record: string, path: string, message: string) =>
    out.push({ check: "provenance", severity, file, record, path, message });

  const sources = occFile.metadata.field_sources ?? {};
  const resolve = (path: string) => fieldSourceKey(sources, path);

  const unresolved = new Map<string, Set<string>>();
  for (const occ of occFile.occupations) {
    for (const { path } of leaves(occ)) {
      const p = stripIndices(path);
      if (!resolve(p)) unresolved.set(p, (unresolved.get(p) ?? new Set()).add(occ.soc_code));
    }
  }
  for (const [p, socs] of unresolved) {
    f("warn", OCC, "metadata", p, `No field_sources entry for this field or a parent (${socs.size} records)`);
  }

  for (const [key, src] of Object.entries(sources)) {
    const missing = [src.data_vintage === null && "data_vintage", src.source_url === null && "source_url"].filter(Boolean);
    if (!missing.length) continue;
    const derived = /^Computed|build pipeline|DEPRECATED/i.test(src.source);
    f(
      derived ? "info" : "warn",
      OCC,
      "metadata",
      `field_sources.${key}`,
      `${missing.join(" and ")} null${derived ? ` (derived field: "${src.source.slice(0, 70)}${src.source.length > 70 ? "…" : ""}")` : ""}`,
    );
  }

  const fs = instFile.metadata.field_sources;
  for (const k of ["default", "programs"] as const) {
    const src = fs?.[k];
    if (!src) f("error", INST, "metadata", `field_sources.${k}`, "missing");
    else if (!src.source_url || !src.data_vintage) f("warn", INST, "metadata", `field_sources.${k}`, "source_url or data_vintage is null");
  }

  for (const inst of instFile.institutions) {
    const required =
      inst.provider_type === "Title IV institution"
        ? (["admissions", "cost_and_net_price", "outcomes_and_debt"] as const)
        : (["apprenticeship"] as const);
    for (const section of required) {
      const p = inst.provenance?.[section];
      if (!p) {
        f("error", INST, inst.record_id, `provenance.${section}`, "missing");
        continue;
      }
      if (!p.source_url) f("error", INST, inst.record_id, `provenance.${section}.source_url`, "missing");
      if (inst.provider_type === "Title IV institution" && !p.data_vintage) {
        f("error", INST, inst.record_id, `provenance.${section}.data_vintage`, "missing");
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 6. Local providers and programs
// ---------------------------------------------------------------------------

export function checkProviders(occs: Occupation[], insts: Institution[]): Finding[] {
  const out: Finding[] = [];
  const ids = new Set(insts.map((i) => i.record_id));

  for (const occ of occs) {
    const { dmv_providers, dmv_providers_unconfirmed } = occ.cip_routing;
    if (dmv_providers.length === 0) {
      const flagged = isFlagged(occ.data_quality_flags, "cip_routing.dmv_providers");
      out.push({
        check: "providers",
        severity: flagged ? "known" : "warn",
        file: OCC,
        record: occ.soc_code,
        path: "cip_routing.dmv_providers",
        message: `${occ.career_title}: no local provider${dmv_providers_unconfirmed.length ? ` (unconfirmed: ${dmv_providers_unconfirmed.join(", ")})` : ""}${flagged ? "; card says no local program and shows the national route" : ""}`,
      });
    }
    for (const [field, list] of [["dmv_providers", dmv_providers], ["dmv_providers_unconfirmed", dmv_providers_unconfirmed]] as const) {
      for (const id of list) {
        if (!ids.has(id)) {
          out.push({ check: "providers", severity: "error", file: OCC, record: occ.soc_code, path: `cip_routing.${field}`, message: `${id} is not a record_id in institutions.json` });
        }
      }
    }
  }

  for (const inst of insts) {
    const zero = inst.programs.filter((p) => p.completers_2yr === 0);
    const nul = inst.programs.filter((p) => p.completers_2yr === null);
    const isSponsor = inst.provider_type !== "Title IV institution";
    if (zero.length) {
      out.push({
        check: "providers",
        severity: "known",
        file: INST,
        record: inst.record_id,
        path: "programs[].completers_2yr",
        message: `${zero.length} of ${inst.programs.length} programs have 0 completers (excluded from dmv_providers)`,
      });
    }
    if (nul.length) {
      out.push({
        check: "providers",
        severity: isSponsor ? "info" : "known",
        file: INST,
        record: inst.record_id,
        path: "programs[].completers_2yr",
        message: isSponsor
          ? "completers not reported for apprenticeship programs (expected)"
          : `${nul.length} of ${inst.programs.length} programs have null completers (not reported)`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 7. Q4 labels vs. dataset values
// ---------------------------------------------------------------------------

export function checkQ4(occs: Occupation[], fixtures: StudentFixture[] = []): Finding[] {
  const out: Finding[] = [];
  const scoreKeys = new Set<string>(ONET_WORK_VALUES);

  for (const opt of Q4_OPTIONS) {
    if (opt.value === "curiosity") {
      out.push({
        check: "q4",
        severity: "known",
        file: OCC,
        record: "all",
        path: "work_values.curiosity",
        message: `"${opt.label}" → curiosity: null in every record, pending team decision`,
      });
    } else if (!scoreKeys.has(opt.value)) {
      out.push({ check: "q4", severity: "error", file: OCC, record: "all", path: "work_values.scores", message: `"${opt.label}" → ${opt.value}: no score key` });
    }
  }

  const sample = occs.find((o) => o.work_values)?.work_values;
  if (sample) {
    for (const k of Object.keys(sample.scores)) {
      if (!Q4_OPTIONS.some((o) => o.value === k)) {
        out.push({ check: "q4", severity: "warn", file: OCC, record: "all", path: `work_values.scores.${k}`, message: "Score key has no Q4 option" });
      }
    }
  }

  for (const occ of occs) {
    if (occ.work_values === null) {
      out.push({
        check: "q4",
        severity: "known",
        file: OCC,
        record: occ.soc_code,
        path: "work_values",
        message: `${occ.career_title}: no O*NET Work Values rating; "Why it fits you" can't use values for this career`,
      });
    }
  }

  out.push({
    check: "q4",
    severity: "info",
    file: OCC,
    record: "all",
    path: "work_profile.value_system",
    message: "Deprecated legacy labels; not used for Q4",
  });

  const labels = new Set(Q4_OPTIONS.map((o) => o.label));
  for (const fx of fixtures) {
    const q4 = fx.data.quiz_responses?.q4_values_most_least;
    const answers = [
      ...(q4?.most_important ?? []).map((a, i) => ({ a, path: `most_important[${i}]` })),
      ...(q4?.least_important ? [{ a: q4.least_important, path: "least_important" }] : []),
    ];
    for (const { a, path } of answers) {
      if (!labels.has(a)) {
        out.push({ check: "q4", severity: "error", file: "fixtures", record: fx.name, path: `quiz_responses.q4_values_most_least.${path}`, message: `"${a}" is not a Q4 option label` });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 8. data_quality_flags counts
// ---------------------------------------------------------------------------

export interface FlagCounts {
  total: number;
  records: number;
  byField: Record<string, number>;
}

export function countDataQualityFlags(records: Array<{ data_quality_flags: DataQualityFlag[] }>): FlagCounts {
  const byField: Record<string, number> = {};
  let total = 0;
  for (const r of records) {
    for (const fl of r.data_quality_flags) {
      total++;
      byField[fl.field] = (byField[fl.field] ?? 0) + 1;
    }
  }
  return { total, records: records.filter((r) => r.data_quality_flags.length > 0).length, byField };
}
