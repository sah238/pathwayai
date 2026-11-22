/**
 * Live check: posts the 12 saved cases to a running dev server's
 * /api/recommend and prints a pass count. Makes real Claude API calls (up to
 * 24 Haiku requests). It is never run by npm test. Commands: docs/test-report.md.
 *
 *   npx tsx scripts/run-recommend-live.ts [baseUrl]
 *
 * Output holds case ids, career codes and problems, never student answers.
 * Exit code is 1 if any case fails.
 */
import { readFileSync } from "node:fs";
import { RecommendResponseSchema } from "../app/api/recommend/types";
import occupations from "../data/occupations.json";

const base = process.argv[2] ?? "http://localhost:3002";
const url = `${base}/api/recommend`;
const dir = "lib/match/fixtures";

const IDS = [
  ...Array.from({ length: 10 }, (_, i) => `student_${String(i + 1).padStart(2, "0")}`),
  "off_topic_pizza",
  "conflict_surgeon",
];
const CONFLICT = new Set(["student_05", "conflict_surgeon"]);
const roster = new Set(occupations.occupations.map((o) => o.soc_code));

function check(id: string, status: number, body: unknown): { problems: string[]; detail: string } {
  if (status !== 200) {
    const code = (body as { error?: string } | null)?.error ?? "no error code";
    return { problems: [`HTTP ${status} (${code})`], detail: "" };
  }
  const parsed = RecommendResponseSchema.safeParse(body);
  if (!parsed.success) return { problems: ["response does not match the schema"], detail: "" };
  const data = parsed.data;

  if (id === "off_topic_pizza") {
    return { problems: data.kind === "nudge" ? [] : ["expected the nudge"], detail: data.kind };
  }
  if (data.kind !== "cards") return { problems: ["expected cards, got the nudge"], detail: "nudge" };

  const problems: string[] = [];
  const socs = data.cards.map((c) => c.soc);
  if (new Set(socs).size !== 3) problems.push("careers are not distinct");
  for (const soc of socs) if (!roster.has(soc)) problems.push(`${soc} is not in the dataset`);

  const slots = data.cards.map((c) => c.slot).join(",");
  if (CONFLICT.has(id)) {
    if (data.mode !== "conflict") problems.push(`mode ${data.mode}, expected conflict`);
    if (slots !== "closest_match,short_training,short_training") problems.push(`slots ${slots}`);
  } else {
    if (data.mode !== "standard") problems.push(`mode ${data.mode}, expected standard`);
    if (slots !== "direct,two_year,adjacent") problems.push(`slots ${slots}`);
  }
  const summaries = data.cards.filter((c) => c.summary.kind === "summary").length;
  return { problems, detail: `${data.mode} ${socs.join(" ")} (${summaries}/3 AI summaries)` };
}

async function main() {
  let passed = 0;
  for (const id of IDS) {
    const quiz = JSON.parse(readFileSync(`${dir}/${id}.json`, "utf8")).quiz_responses;
    // The quiz never sends the ZIP (components/quiz/submit.ts).
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...quiz, q11_zip_code: null }),
    });
    const body: unknown = await res.json().catch(() => null);
    const { problems, detail } = check(id, res.status, body);
    if (problems.length === 0) passed++;
    console.log(`${id}: ${problems.length ? `FAIL (${problems.join("; ")})` : "PASS"} ${detail}`.trimEnd());
  }
  console.log(`\n${passed}/${IDS.length} passed`);
  process.exitCode = passed === IDS.length ? 0 : 1;
}

main().catch((e: unknown) => {
  console.error(`Could not reach ${url}: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
