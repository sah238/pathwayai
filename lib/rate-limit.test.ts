import { describe, expect, it, vi } from "vitest";
import { clientIp, createRateLimiter, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS, withRateLimit } from "./rate-limit";

const req = (ip?: string) =>
  new Request("http://localhost/api/x", { method: "POST", headers: ip ? { "x-forwarded-for": ip } : {} });

describe("rate limiting", () => {
  it("allows 60 requests per minute per IP (a classroom shares one IP)", () => {
    expect(RATE_LIMIT_REQUESTS).toBe(60);
    expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
    const l = createRateLimiter();
    for (let i = 0; i < 60; i++) expect(l.allow("1.1.1.1", 1000)).toBe(true);
    expect(l.allow("1.1.1.1", 1000)).toBe(false);
    expect(l.allow("2.2.2.2", 1000)).toBe(true);
    expect(l.allow("1.1.1.1", 1000 + 60_000)).toBe(true);
  });

  it("reads the first x-forwarded-for address", () => {
    expect(clientIp(req("9.9.9.9, 10.0.0.1"))).toBe("9.9.9.9");
    expect(clientIp(req())).toBe("unknown");
  });

  it("returns a generic 429 without calling the handler once over the limit", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const POST = withRateLimit(handler, createRateLimiter(1));
    expect((await POST(req("3.3.3.3"))).status).toBe(200);
    const res = await POST(req("3.3.3.3"));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
