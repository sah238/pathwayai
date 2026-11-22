/**
 * POST /api/recommend — the full quiz-to-cards flow (CLAUDE.md, How It Works):
 * Stage 1 extraction, deterministic selection, Stage 2 summaries.
 * Body: a QuizResponses object. Returns a RecommendResponse (./types.ts).
 * Server-side only; the key is read from process.env.ANTHROPIC_API_KEY.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getRepository } from "@/lib/data/server";
import { withRateLimit } from "@/lib/rate-limit";
import { createRecommendHandler } from "./handler";

/**
 * Two Claude calls run one after the other, each capped at CALL_TIMEOUT_MS
 * with no retries, so the worst case is about 40 s plus selection (a few ms).
 * 60 s leaves headroom and stays well under Vercel's 300 s limit (default and
 * Hobby maximum with Fluid compute, docs updated 2026-08-24). Setting it here
 * keeps the route from inheriting a lower project default. The quiz's browser
 * timeout (components/quiz/submit.ts) is just under this.
 */
export const maxDuration = 60;

const CALL_TIMEOUT_MS = 20_000;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  // No retries: a slow Stage 1 should fail fast to the /browse message, and Stage 2 falls back to task lists.
  client ??= new Anthropic({ apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 0 });
  return client;
}

// Per-IP limit; per serverless instance only (see lib/rate-limit.ts).
export const POST = withRateLimit(createRecommendHandler(getClient, getRepository));
