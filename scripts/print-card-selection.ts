/**
 * Prints fixture → three careers → score breakdown, from the saved Stage 1
 * outputs in lib/match/fixtures. No API calls.
 *
 *   npx tsx scripts/print-card-selection.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import institutions from "../data/institutions.json";
import occupations from "../data/occupations.json";
import { repositoryFromRaw } from "../lib/data/repository";
import { ExtractedFiltersSchema } from "../lib/extract/schema";
import { selectCards, type Pick } from "../lib/match/selectCards";
import { QuizResponsesSchema } from "../lib/quiz/responses";

const dir = "lib/match/fixtures";
const repo = repositoryFromRaw(occupations, institutions);

const fmt = (p: Pick) => {
  const b = p.breakdown;
  const vals = b.values.map((v) => `${v.value}:${v.student_weight}×${v.career_points}`).join(" ");
  const extras = [
    b.title ? `${b.title_match} +${b.title}` : "",
    p.dream_job_label ? `"${p.dream_job_label.heading}" / "${p.dream_job_label.note}"` : "",
    b.apprenticeship_bonus ? `appr +${b.apprenticeship_bonus}` : "",
    p.avoid_hits.length ? `AVOID HIT: ${p.avoid_hits.join(",")}` : "",
    ...p.fallbacks.map((f) => `fallback: ${f}`),
  ].filter(Boolean);
  const title = repo.getOccupation(p.soc)?.career_title ?? "?";
  return `  ${p.slot.padEnd(14)} ${p.soc} ${title.slice(0, 40).padEnd(40)} total ${String(b.total).padStart(2)} = int ${b.interest} + val ${b.values_total} [${vals}]${extras.length ? ` · ${extras.join(" · ")}` : ""}`;
};

for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
  const raw = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const filters = ExtractedFiltersSchema.parse(raw.filters);
  const quiz = QuizResponsesSchema.parse(raw.quiz_responses);
  const r = selectCards(filters, quiz, repo.listOccupations());
  const head = `${raw.id}  (tags ${filters.interest_tags.join("") || "-"}; values ${filters.work_values.join(",") || "-"}; ceiling ${filters.max_education ?? "none"} / JZ ${filters.job_zone_ceiling ?? "none"}; avoid ${quiz.q9_avoid.selected_flags.join(",") || "-"})`;
  console.log(`\n${head}`);
  if (r.kind === "nudge") console.log(`  NUDGE: ${r.message}`);
  else {
    if (r.mode === "conflict") console.log("  [conflict mode]");
    r.cards.forEach((c) => console.log(fmt(c)));
  }
}
