/**
 * Request handling for POST /api/extract, kept out of the route file so tests
 * can pass a fake Claude client. Error bodies are generic: no student text, no
 * model output and no SDK error message is echoed or logged.
 */
import "server-only";
import { QuizResponsesSchema } from "@/lib/quiz/responses";
import { ExtractError, extractFilters, type MessagesClient } from "./extract";

/** Largest request body accepted, in bytes. A full quiz is about 2 KB. */
export const MAX_BODY_BYTES = 8 * 1024;
/** Longest single text answer accepted, in characters. */
export const MAX_TEXT_CHARS = 500;

function error(status: number, code: string): Response {
  return Response.json({ error: code }, { status });
}

/** True if any string anywhere in the value is longer than MAX_TEXT_CHARS. */
function hasLongText(value: unknown): boolean {
  if (typeof value === "string") return value.length > MAX_TEXT_CHARS;
  if (Array.isArray(value)) return value.some(hasLongText);
  if (value && typeof value === "object") return Object.values(value).some(hasLongText);
  return false;
}

export function createExtractHandler(getClient: () => MessagesClient | null) {
  return async function POST(request: Request): Promise<Response> {
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return error(413, "request_too_large");

    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return error(413, "request_too_large");
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return error(400, "invalid_json");
    }
    if (hasLongText(body)) return error(413, "answer_too_long");

    const parsed = QuizResponsesSchema.safeParse(body);
    if (!parsed.success) return error(400, "invalid_quiz_responses");

    const client = getClient();
    if (!client) return error(500, "not_configured");

    try {
      const filters = await extractFilters(client, parsed.data);
      return Response.json(filters);
    } catch (e) {
      if (e instanceof ExtractError) {
        return error(502, e.code === "refusal" ? "declined" : "invalid_model_output");
      }
      return error(502, "upstream_error");
    }
  };
}
