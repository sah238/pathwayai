/**
 * Simple per-IP fixed-window rate limiting for the Claude API routes
 * (CLAUDE.md, Operations: per-IP throttling).
 *
 * Counters live in this module's memory. Serverless instances (Vercel
 * Functions) don't share memory, so each instance counts on its own and a
 * cold start resets the count: the real limit is per instance, not global.
 * That is fine for the beta; a shared store (e.g. Redis) would be needed for
 * a hard limit.
 *
 * Only a count and a window start are kept per IP, nothing else, and nothing
 * is logged.
 */
import "server-only";

/** A classroom often shares one IP, so the limit is generous. */
export const RATE_LIMIT_REQUESTS = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;
/** Above this many tracked IPs, expired windows are swept so memory stays bounded. */
const SWEEP_AT = 10_000;

export interface RateLimiter {
  /** True if this request is allowed; counts it either way. */
  allow(key: string, now?: number): boolean;
}

export function createRateLimiter(
  limit = RATE_LIMIT_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS,
): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    allow(key, now = Date.now()) {
      if (windows.size > SWEEP_AT) {
        for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
      }
      const w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      w.count += 1;
      return w.count <= limit;
    },
  };
}

/** The client IP as reported by the platform proxy; "unknown" when absent. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Wraps a route handler so requests over the limit get a generic 429. */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  limiter: RateLimiter = createRateLimiter(),
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!limiter.allow(clientIp(request))) {
      return Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) } },
      );
    }
    return handler(request);
  };
}
