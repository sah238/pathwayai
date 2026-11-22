/**
 * Request handling for POST /api/summarize, kept out of the route file so tests
 * can pass a fake Claude client. Error bodies are generic, and nothing is logged.
 */
import "server-only";
import type { DataRepository } from "@/lib/data/repository";
import type { Occupation } from "@/lib/data/schemas";
import { readBodyWithLimit } from "@/lib/extract/handler";
import { SummarizeRequestSchema } from "./schema";
import { summarizeCareers, type MessagesClient } from "./summarize";

/** Largest request body accepted, in bytes. Three SOC codes take about 50. */
export const MAX_BODY_BYTES = 256;

function error(status: number, code: string): Response {
  return Response.json({ error: code }, { status });
}

export function createSummarizeHandler(
  getClient: () => MessagesClient | null,
  getRepository: () => Pick<DataRepository, "getOccupation" | "occupationSource">,
) {
  return async function POST(request: Request): Promise<Response> {
    // Cheap early reject; the streaming read below is the real limit.
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return error(413, "request_too_large");

    const raw = await readBodyWithLimit(request, MAX_BODY_BYTES);
    if (raw === null) return error(413, "request_too_large");

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return error(400, "invalid_json");
    }
    const parsed = SummarizeRequestSchema.safeParse(body);
    if (!parsed.success) return error(400, "invalid_socs");

    const repo = getRepository();
    const occupations = parsed.data.socs.map((soc) => repo.getOccupation(soc));
    if (occupations.some((o) => o === null)) return error(404, "unknown_soc");

    // A missing key or model failure still returns 200 with each career's task list.
    const careers = await summarizeCareers(
      getClient(),
      occupations as Occupation[],
      repo.occupationSource("core_tasks"),
    );
    return Response.json({ careers });
  };
}
