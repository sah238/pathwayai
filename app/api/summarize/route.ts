/**
 * POST /api/summarize — Stage 2 grounded summaries (CLAUDE.md, How It Works).
 * Body: { "socs": [three SOC codes] }. Returns { careers: CareerSummary[] }.
 * Server-side only; the key is read from process.env.ANTHROPIC_API_KEY.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getRepository } from "@/lib/data/server";
import { createSummarizeHandler } from "@/lib/summarize/handler";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, timeout: 30_000 });
  return client;
}

export const POST = createSummarizeHandler(getClient, getRepository);
