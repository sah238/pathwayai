/**
 * Stage 1 intent extraction: one Claude API call with a structured-output
 * schema, then server-side Zod validation of the result.
 *
 * Nothing here logs prompts or responses.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { QuizResponses } from "@/lib/quiz/responses";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { ModelOutputSchema, type ExtractedFilters, type ModelOutput } from "./schema";
import { trainingCeiling } from "./training";

/** Fast, low-cost model for both stages (CLAUDE.md, Technical Architecture). */
export const EXTRACT_MODEL = "claude-haiku-5-5";
/** Covers adaptive thinking plus a short JSON object. */
export const EXTRACT_MAX_TOKENS = 2048;

/** Only the part of the SDK client this module uses, so tests can fake it. */
export type MessagesClient = Pick<Anthropic, "messages">;

export type ExtractErrorCode = "refusal" | "truncated" | "invalid_output";

export class ExtractError extends Error {
  constructor(readonly code: ExtractErrorCode) {
    super(`Stage 1 extraction failed: ${code}`);
    this.name = "ExtractError";
  }
}

export function buildRequest(responses: QuizResponses): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: EXTRACT_MODEL,
    max_tokens: EXTRACT_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(responses) }],
    output_config: { effort: "low", format: zodOutputFormat(ModelOutputSchema) },
  };
}

/** Parses and validates the model's JSON; throws ExtractError if it is off-list. */
export function parseModelOutput(message: Anthropic.Message): ModelOutput {
  if (message.stop_reason === "refusal") throw new ExtractError("refusal");
  if (message.stop_reason === "max_tokens") throw new ExtractError("truncated");

  const text = message.content.find((b) => b.type === "text")?.text;
  if (text === undefined) throw new ExtractError("invalid_output");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ExtractError("invalid_output");
  }
  const parsed = ModelOutputSchema.safeParse(json);
  if (!parsed.success) throw new ExtractError("invalid_output");

  const out = parsed.data;
  return {
    ...out,
    interest_tags: [...new Set(out.interest_tags)].slice(0, 3),
    work_values: [...new Set(out.work_values)].slice(0, 3),
    work_context: [...new Set(out.work_context)],
  };
}

export async function extractFilters(
  client: MessagesClient,
  responses: QuizResponses,
): Promise<ExtractedFilters> {
  const message = await client.messages.create(buildRequest(responses));
  const out = parseModelOutput(message);
  return {
    ...out,
    ...trainingCeiling(responses.q10_training.max_education),
    zip_code: responses.q11_zip_code,
  };
}
