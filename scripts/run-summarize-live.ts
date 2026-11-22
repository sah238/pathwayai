/**
 * Live run: posts all 30 careers, three at a time, to a running dev server's
 * /api/summarize and prints each result. Makes real Claude API calls (10 Haiku
 * requests). Start it yourself:
 *
 *   npx next dev -p 3002          (with ANTHROPIC_API_KEY in .env.local)
 *   npx tsx scripts/run-summarize-live.ts [baseUrl]
 *
 * Exit code is 1 on an HTTP error or if a returned summary contains a number
 * (the prompt forbids them and the source tasks have none).
 */
import { readFileSync } from "node:fs";
import type { CareerSummary } from "../lib/summarize/schema";
import { findNumbers } from "../lib/summarize/verify-numbers";

const base = process.argv[2] ?? "http://localhost:3002";
const url = `${base}/api/summarize`;
const socs: string[] = JSON.parse(readFileSync("data/occupations.json", "utf8")).occupations.map(
  (o: { soc_code: string }) => o.soc_code,
);

async function main() {
  let failures = 0;
  let summaries = 0;
  let fallbacks = 0;
  for (let i = 0; i < socs.length; i += 3) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ socs: socs.slice(i, i + 3) }),
    });
    if (res.status !== 200) {
      failures++;
      console.log(`\n=== ${socs.slice(i, i + 3).join(", ")}: FAIL (HTTP ${res.status})`);
      continue;
    }
    const { careers } = (await res.json()) as { careers: CareerSummary[] };
    for (const c of careers) {
      if (c.kind === "tasks") {
        fallbacks++;
        console.log(`\n=== ${c.soc_code}: FALLBACK to tasks`);
        continue;
      }
      summaries++;
      const words = c.summary.split(" ").length;
      const bad = findNumbers(c.summary).length > 0;
      if (bad) failures++;
      console.log(`\n=== ${c.soc_code}: ${bad ? "FAIL (contains a number)" : "PASS"} (${words} words)`);
      console.log(c.summary);
    }
  }
  console.log(`\n${summaries} summaries, ${fallbacks} fallbacks, ${failures} failures`);
  if (failures) process.exitCode = 1;
}

void main();
