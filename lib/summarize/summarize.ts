/**
 * Stage 2 grounded summaries: one Claude API call for the three careers, then
 * a code check of every summary. Any failure falls back to the record's first
 * core tasks, so this never throws for a model or network problem.
 *
 * Nothing here logs prompts or responses.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Source } from "@/lib/data/provenance";
import type { Occupation } from "@/lib/data/schemas";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { ModelOutputSchema, type CareerSummary } from "./schema";
import { numbersAreGrounded } from "./verify-numbers";

/** Same fast, low-cost model as Stage 1 (CLAUDE.md, Technical Architecture). */
export const SUMMARIZE_MODEL = "claude-haiku-5-5";
/** Room for three short summaries plus any default thinking, which counts against this cap. */
export const SUMMARIZE_MAX_TOKENS = 2048;
/** About 70 words with slack; anything longer ignored the brief. */
export const MAX_SUMMARY_CHARS = 700;
export const FALLBACK_TASK_COUNT = 3;

/** Only the part of the SDK client this module uses, so tests can fake it. */
export type MessagesClient = Pick<Anthropic, "messages">;

export function buildRequest(occupations: readonly Occupation[]): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: SUMMARIZE_MODEL,
    max_tokens: SUMMARIZE_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(occupations) }],
    output_config: { effort: "low", format: zodOutputFormat(ModelOutputSchema) },
  };
}

/** Draft summaries by SOC. Empty on any unusable reply; a SOC returned twice is dropped. */
export function parseModelOutput(message: Anthropic.Message): Map<string, string> {
  const drafts = new Map<string, string>();
  if (message.stop_reason !== "end_turn") return drafts;
  const text = message.content.find((b) => b.type === "text")?.text;
  if (text === undefined) return drafts;

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return drafts;
  }
  const parsed = ModelOutputSchema.safeParse(json);
  if (!parsed.success) return drafts;

  const repeated = new Set<string>();
  for (const { soc_code, summary } of parsed.data.summaries) {
    if (drafts.has(soc_code)) repeated.add(soc_code);
    drafts.set(soc_code, summary);
  }
  for (const soc of repeated) drafts.delete(soc);
  return drafts;
}

/** The cleaned summary if it passes every check, else null. */
export function checkSummary(occ: Occupation, draft: string | undefined): string | null {
  const summary = draft?.replace(/\s+/g, " ").trim();
  if (!summary || summary.length > MAX_SUMMARY_CHARS) return null;
  return numbersAreGrounded(summary, [occ.career_title, ...occ.core_tasks]) ? summary : null;
}

export async function summarizeCareers(
  client: MessagesClient | null,
  occupations: readonly Occupation[],
  source: Source | null,
): Promise<CareerSummary[]> {
  let drafts = new Map<string, string>();
  if (client) {
    try {
      drafts = parseModelOutput(await client.messages.create(buildRequest(occupations)));
    } catch {
      // Upstream failure: every career uses its task list below.
    }
  }
  return occupations.map((occ) => {
    const summary = checkSummary(occ, drafts.get(occ.soc_code));
    return summary
      ? { soc_code: occ.soc_code, kind: "summary", summary, source }
      : { soc_code: occ.soc_code, kind: "tasks", tasks: occ.core_tasks.slice(0, FALLBACK_TASK_COUNT), source };
  });
}
