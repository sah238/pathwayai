/**
 * Loaded before every vitest file: npm test can never reach the Claude API.
 * The key is removed and any fetch to a non-local host throws.
 */
delete process.env.ANTHROPIC_API_KEY;

export const BLOCKED_MESSAGE = "Network blocked during npm test";

const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input), "http://localhost");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(`${BLOCKED_MESSAGE}: ${url.hostname}`);
  }
  return realFetch(input, init);
}) as typeof fetch;
