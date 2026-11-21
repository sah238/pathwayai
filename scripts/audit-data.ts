/**
 * Data audit report for data/occupations.json and data/institutions.json.
 *
 *   npx tsx scripts/audit-data.ts           (or: npm run audit:data)
 *   npx tsx scripts/audit-data.ts --verbose (also lists every info finding)
 *
 * Read-only. Exits 0 when the report prints, even with findings; exits 1 only
 * if a data file can't be read or isn't valid JSON.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  SEVERITIES,
  checkCardFields,
  checkProvenance,
  checkProviders,
  checkQ4,
  checkRegion,
  checkSchema,
  checkZeros,
  countDataQualityFlags,
  type CardRow,
  type Finding,
  type StudentFixture,
} from "../lib/data/audit";
import type { InstitutionsFile, OccupationsFile } from "../lib/data/schemas";

const DATA = resolve(__dirname, "..", "data");
const verbose = process.argv.includes("--verbose");

function load(file: string): unknown {
  try {
    return JSON.parse(readFileSync(join(DATA, file), "utf8"));
  } catch (err) {
    console.error(`Cannot read ${join("data", file)}: ${(err as Error).message}`);
    process.exit(1);
  }
}

const occFile = load("occupations.json") as OccupationsFile;
const instFile = load("institutions.json") as InstitutionsFile;
const fixtures: StudentFixture[] = readdirSync(join(DATA, "fixtures"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .map((name) => ({ name, data: load(join("fixtures", name)) as StudentFixture["data"] }));

const occs = occFile.occupations ?? [];
const insts = instFile.institutions ?? [];
const all: Finding[] = [];

const TAG: Record<Finding["severity"], string> = { error: "ERROR", warn: "WARN ", known: "KNOWN", info: "info " };

function heading(n: number, title: string) {
  console.log(`\n${n}. ${title}\n${"-".repeat(3 + title.length)}`);
}

function print(findings: Finding[], { collapseAbove = 12 } = {}) {
  all.push(...findings);
  const shown = findings.filter((f) => verbose || f.severity !== "info" || findings.length <= collapseAbove);
  if (findings.length === 0) {
    console.log("  ✓ no findings");
    return;
  }
  for (const f of shown) {
    console.log(`  [${TAG[f.severity]}] ${f.file} · ${f.record} · ${f.path}\n          ${f.message}`);
  }
  const hidden = findings.length - shown.length;
  if (hidden) console.log(`  (+${hidden} info findings; run with --verbose)`);
}

/** Run a check; a check that throws (e.g. on a broken shape) is reported, not fatal. */
function run(name: string, fn: () => Finding[]): Finding[] {
  try {
    return fn();
  } catch (err) {
    return [{ check: name, severity: "error", file: "occupations.json", record: "-", path: "-", message: `check crashed: ${(err as Error).message}` }];
  }
}

console.log("PathwayAI data audit");
console.log(`occupations.json  v${occFile.metadata?.schema_version}  ${occs.length} records`);
console.log(`institutions.json v${instFile.metadata?.schema_version}  ${insts.length} records`);
console.log(`fixtures          ${fixtures.length} files`);

heading(1, "Schema validation");
print(run("schema", () => checkSchema(occFile, instFile)));

heading(2, "Region (DC/MD/VA only)");
print(run("region", () => checkRegion(occs, insts, fixtures)));

heading(3, "Zeros where null is more likely");
const zeros = run("zeros", () => checkZeros(occs, insts));
const cdr = zeros.filter((f) => f.path.endsWith("cohort_default_rate_3yr") && f.severity === "known");
if (cdr.length) {
  console.log(`  [KNOWN] institutions.json · ${cdr.length} records · outcomes_and_debt.cohort_default_rate_3yr`);
  console.log("          0.0 is the real pandemic-era CDR; handled (cohort_default_rate_display is false)");
  all.push(...cdr);
}
const otherZeros = zeros.filter((f) => !cdr.includes(f));
if (otherZeros.length || !cdr.length) print(otherZeros);

heading(4, "Beta-core career card fields");
let card: { rows: CardRow[]; findings: Finding[] } = { rows: [], findings: [] };
try {
  card = checkCardFields(occs, insts);
} catch (err) {
  card.findings.push({ check: "card-fields", severity: "error", file: "occupations.json", record: "-", path: "-", message: `check crashed: ${(err as Error).message}` });
}
const w = {
  factor: Math.max(6, ...card.rows.map((r) => r.factor.length)),
  item: Math.max(5, ...card.rows.map((r) => r.item.length)),
  status: 9,
  cov: Math.max(8, ...card.rows.map((r) => (r.coverage ?? "").length)),
};
console.log(`  ${"Factor".padEnd(w.factor)} ${"Field".padEnd(w.item)} ${"Status".padEnd(w.status)} ${"Coverage".padEnd(w.cov)} Note`);
for (const r of card.rows) {
  console.log(
    `  ${r.factor.padEnd(w.factor)} ${r.item.padEnd(w.item)} ${r.status.padEnd(w.status)} ${(r.coverage ?? "").padEnd(w.cov)} ${r.note ?? ""}`,
  );
}
all.push(...card.findings);
const cardIssues = card.findings.filter((f) => f.severity !== "known");
if (cardIssues.length) print(cardIssues);
else console.log(`  (${card.findings.length} missing values, all documented in data_quality_flags)`);

heading(5, "Provenance (metadata.field_sources, institution provenance)");
print(run("provenance", () => checkProvenance(occFile, instFile)));

heading(6, "Local providers and programs");
const providers = run("providers", () => checkProviders(occs, insts));
const programRows = providers.filter((f) => f.path === "programs[].completers_2yr");
print(providers.filter((f) => !programRows.includes(f)));
all.push(...programRows);
const progs = insts.flatMap((i) => i.programs ?? []);
console.log(
  `  completers_2yr across ${progs.length} programs: ${progs.filter((p) => p.completers_2yr === 0).length} are 0, ${progs.filter((p) => p.completers_2yr === null).length} are null (known: excluded from dmv_providers)`,
);
console.log(`  ${"Provider".padEnd(16)} ${"programs".padStart(8)} ${"0".padStart(5)} ${"null".padStart(5)}`);
for (const i of insts) {
  const z = i.programs.filter((p) => p.completers_2yr === 0).length;
  const n = i.programs.filter((p) => p.completers_2yr === null).length;
  if (z || n) console.log(`  ${i.record_id.padEnd(16)} ${String(i.programs.length).padStart(8)} ${String(z).padStart(5)} ${String(n).padStart(5)}`);
}

heading(7, "Quiz Q4 labels vs. dataset values");
print(run("q4", () => checkQ4(occs, fixtures)));

heading(8, "data_quality_flags");
for (const [file, recs] of [["occupations.json", occs], ["institutions.json", insts]] as const) {
  const c = countDataQualityFlags(recs);
  console.log(`  ${file}: ${c.total} flags on ${c.records} of ${recs.length} records`);
  for (const [field, n] of Object.entries(c.byField).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(3)}  ${field}`);
  }
}

const counts = Object.fromEntries(SEVERITIES.map((s) => [s, all.filter((f) => f.severity === s).length]));
console.log(`\nSummary: ${counts.error} error · ${counts.warn} warn · ${counts.known} known · ${counts.info} info`);
