/**
 * Live run: posts every data/fixtures/student_*.json quiz and the two edge-case
 * prompts to a running dev server's /api/extract, and prints each result.
 * Makes real Claude API calls (12 Haiku requests). Start it yourself:
 *
 *   npx next dev -p 3002          (with ANTHROPIC_API_KEY in .env.local)
 *   npx tsx scripts/run-extract-fixtures.ts [baseUrl] [--save <dir>]
 *
 * --save writes each valid result to <dir>/<id>.json as
 * { id, quiz_responses, filters }, so matching tests (lib/match) can run on
 * saved Stage 1 output without calling the API. Invalid results are not saved.
 *
 * Exit code is 1 if any result is not valid filter JSON or an edge case has
 * the wrong flags.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { ExtractedFiltersSchema } from "../lib/extract/schema";
import { EDGE_CASES } from "../lib/extract/test-inputs";

const args = process.argv.slice(2);
const saveAt = args.indexOf("--save");
const saveDir = saveAt >= 0 ? args[saveAt + 1] : undefined;
if (saveAt >= 0 && !saveDir) throw new Error("--save needs a directory");
const positional = args.filter((_, i) => saveAt < 0 || (i !== saveAt && i !== saveAt + 1));

const base = positional[0] ?? "http://localhost:3002";
const url = `${base}/api/extract`;
const dir = "data/fixtures";

interface Case {
  id: string;
  input: unknown;
  expect?: { is_career_query: boolean; has_constraint_conflict: boolean };
}

const cases: Case[] = [
  ...readdirSync(dir)
    .filter((f) => /^student_\d+\.json$/.test(f))
    .sort()
    .map((f) => ({
      id: f.replace(".json", ""),
      input: JSON.parse(readFileSync(`${dir}/${f}`, "utf8")).quiz_responses,
    })),
  ...EDGE_CASES,
];

async function main() {
  let failures = 0;
  for (const c of cases) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(c.input),
    });
    const body: unknown = await res.json().catch(() => null);
    const parsed = ExtractedFiltersSchema.safeParse(body);

    const problems: string[] = [];
    if (res.status !== 200) problems.push(`HTTP ${res.status}`);
    if (!parsed.success) problems.push("not valid ExtractedFilters JSON");
    if (parsed.success && c.expect) {
      for (const [k, v] of Object.entries(c.expect) as [keyof typeof c.expect, boolean][]) {
        if (parsed.data[k] !== v) problems.push(`${k} = ${parsed.data[k]}, expected ${v}`);
      }
    }
    if (problems.length) failures++;
    if (saveDir && parsed.success) {
      mkdirSync(saveDir, { recursive: true });
      const out = { id: c.id, quiz_responses: c.input, filters: parsed.data };
      writeFileSync(`${saveDir}/${c.id}.json`, `${JSON.stringify(out, null, 2)}\n`);
    }

    console.log(`\n=== ${c.id}: ${problems.length ? `FAIL (${problems.join("; ")})` : "PASS"}`);
    console.log(JSON.stringify(body, null, 2));
  }
  console.log(`\n${cases.length - failures}/${cases.length} passed`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((e: unknown) => {
  console.error(`Could not reach ${url}: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
