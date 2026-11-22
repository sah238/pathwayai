/**
 * POST /api/extract — Stage 1 intent extraction (CLAUDE.md, How It Works).
 * Body: a QuizResponses object. Returns ExtractedFilters as JSON.
 * Server-side only; the key is read from process.env.ANTHROPIC_API_KEY.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createExtractHandler } from "@/lib/extract/handler";
import { withRateLimit } from "@/lib/rate-limit";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, timeout: 30_000 });
  return client;
}

// Per-IP limit; per serverless instance only (see lib/rate-limit.ts).
export const POST = withRateLimit(createExtractHandler(getClient));
