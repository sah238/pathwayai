/**
 * Request handling for POST /api/recommend: Stage 1 extraction, deterministic
 * card selection, then Stage 2 summaries for the three cards. Kept out of the
 * route file so tests can pass a fake Claude client.
 *
 * Privacy: the ZIP is cleared from the quiz copy before Stage 1 (the Stage 1
 * prompt already leaves it out; this is a second guard). Stage 2 receives
 * only the three occupation records. Income is not a quiz answer, and the
 * strict quiz schema rejects any extra field. Error bodies are generic and
 * nothing is logged.
 */
import "server-only";
import type { DataRepository } from "@/lib/data/repository";
import type { Occupation } from "@/lib/data/schemas";
import { MAX_BODY_BYTES, hasLongText, readBodyWithLimit } from "@/lib/extract/handler";
import { ExtractError, extractFilters, type MessagesClient } from "@/lib/extract/extract";
import type { ExtractedFilters } from "@/lib/extract/schema";
import { SelectionError, selectCards, type Pick as CardPick } from "@/lib/match/selectCards";
import { QuizResponsesSchema } from "@/lib/quiz/responses";
import { summarizeCareers } from "@/lib/summarize/summarize";
import type { RecommendedCard, RecommendResponse } from "./types";

export { MAX_BODY_BYTES };

function error(status: number, code: string): Response {
  return Response.json({ error: code }, { status });
}

/** The student's values this career scored on: points > 0, strongest first, at most 2 (ties keep the student's order). */
export function matchedValues(pick: CardPick): RecommendedCard["matched_values"] {
  return pick.breakdown.values
    .map((v, i) => ({ ...v, i }))
    .filter((v) => v.points > 0)
    .sort((a, b) => b.points - a.points || a.i - b.i)
    .slice(0, 2)
    .map((v) => v.value);
}

/** The student's RIASEC letters that appear in the career's code, in the student's order. */
export function matchedInterests(
  tags: ExtractedFilters["interest_tags"],
  occ: Occupation,
): RecommendedCard["matched_interests"] {
  return tags.filter((t) => occ.work_profile.riasec_code.includes(t));
}

export function createRecommendHandler(
  getClient: () => MessagesClient | null,
  getRepository: () => Pick<DataRepository, "getOccupation" | "listOccupations" | "occupationSource">,
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
    if (hasLongText(body)) return error(413, "answer_too_long");

    const parsed = QuizResponsesSchema.safeParse(body);
    if (!parsed.success) return error(400, "invalid_quiz_responses");
    const quiz = parsed.data;

    const client = getClient();
    if (!client) return error(503, "not_configured");

    let filters: ExtractedFilters;
    try {
      filters = await extractFilters(client, { ...quiz, q11_zip_code: null });
    } catch (e) {
      if (e instanceof ExtractError) {
        return error(502, e.code === "refusal" ? "declined" : "invalid_model_output");
      }
      return error(502, "upstream_error");
    }

    const repo = getRepository();
    let result;
    try {
      result = selectCards(filters, quiz, repo.listOccupations());
    } catch (e) {
      if (e instanceof SelectionError) return error(500, "no_match");
      throw e;
    }

    if (result.kind === "nudge") {
      return Response.json({ kind: "nudge", message: result.message } satisfies RecommendResponse);
    }

    const occupations = result.cards.map((c) => repo.getOccupation(c.soc));
    if (occupations.some((o) => o === null)) return error(500, "no_match");
    const occs = occupations as Occupation[];

    // Stage 2 never throws: a model or network failure falls back to each career's task list.
    const summaries = await summarizeCareers(client, occs, repo.occupationSource("core_tasks"));

    const cards = result.cards.map((pick, i) => ({
      soc: pick.soc,
      slot: pick.slot,
      dream_job_label: pick.dream_job_label,
      matched_values: matchedValues(pick),
      matched_interests: matchedInterests(filters.interest_tags, occs[i]),
      avoid_hits: pick.avoid_hits,
      summary: summaries[i],
    })) as [RecommendedCard, RecommendedCard, RecommendedCard];

    return Response.json({ kind: "cards", mode: result.mode, cards } satisfies RecommendResponse);
  };
}
