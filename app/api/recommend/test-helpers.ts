/**
 * Test-only helpers: a fake Claude client that answers Stage 1 with a saved
 * fixture's filters and Stage 2 with plain summaries, and fixture loading.
 * Not a *.test.ts file, so vitest doesn't run it on its own.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { vi } from "vitest";
import { repositoryFromRaw } from "@/lib/data/repository";
import type { MessagesClient } from "@/lib/extract/extract";
import { SYSTEM_PROMPT as EXTRACT_SYSTEM_PROMPT } from "@/lib/extract/prompt";
import type { ExtractedFilters } from "@/lib/extract/schema";
import type { QuizResponses } from "@/lib/quiz/responses";

export const repo = repositoryFromRaw(
  JSON.parse(readFileSync("data/occupations.json", "utf8")),
  JSON.parse(readFileSync("data/institutions.json", "utf8")),
);

export interface Fixture {
  id: string;
  quiz: QuizResponses;
  filters: ExtractedFilters;
}

export function fixture(id: string): Fixture {
  const raw = JSON.parse(readFileSync(join("lib/match/fixtures", `${id}.json`), "utf8"));
  return { id: raw.id, quiz: raw.quiz_responses, filters: raw.filters };
}

/** A summary with no numbers, so the grounding check always passes. */
export const summaryFor = (soc: string) => `In this career you handle the everyday work of job ${soc.replace(/\d/g, "x")}.`;

function message(json: unknown): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [{ type: "text", citations: null, text: JSON.stringify(json) }],
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

/** Stage 1 → the fixture's model-output fields; Stage 2 → a summary for every SOC in the prompt. */
export function fakeClient(filters: ExtractedFilters, opts: { stage1?: "throw"; stage2?: "throw" } = {}) {
  const create = vi.fn(async (req: Anthropic.MessageCreateParamsNonStreaming) => {
    if (req.system === EXTRACT_SYSTEM_PROMPT) {
      if (opts.stage1 === "throw") throw new Error("upstream down");
      const { is_career_query, has_constraint_conflict, interest_tags, work_values, work_context } = filters;
      return message({ is_career_query, has_constraint_conflict, interest_tags, work_values, work_context });
    }
    if (opts.stage2 === "throw") throw new Error("upstream down");
    const socs = [...new Set(JSON.stringify(req.messages).match(/\d{2}-\d{4}/g) ?? [])];
    return message({ summaries: socs.map((soc) => ({ soc_code: soc, summary: summaryFor(soc) })) });
  });
  const client = { messages: { create } } as unknown as MessagesClient;
  return { client, create };
}

export function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
