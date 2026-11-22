import { readFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { MessagesClient } from "./extract";
import { createExtractHandler, MAX_BODY_BYTES, MAX_TEXT_CHARS } from "./handler";

const student01 = JSON.parse(readFileSync("data/fixtures/student_01.json", "utf8")).quiz_responses;

const reply = {
  id: "msg_test",
  type: "message",
  role: "assistant",
  model: "claude-haiku-5-5",
  stop_reason: "end_turn",
  stop_sequence: null,
  content: [
    {
      type: "text",
      citations: null,
      text: JSON.stringify({
        is_career_query: true,
        has_constraint_conflict: false,
        interest_tags: ["R"],
        work_values: ["achievement"],
        work_context: ["Outdoors"],
      }),
    },
  ],
  usage: { input_tokens: 1, output_tokens: 1 },
} as unknown as Anthropic.Message;

function setup(create = vi.fn().mockResolvedValue(reply)) {
  const client = { messages: { create } } as unknown as MessagesClient;
  return { POST: createExtractHandler(() => client), create };
}

function post(body: string): Request {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/extract", () => {
  it("returns filters for a valid QuizResponses", async () => {
    const { POST, create } = setup();
    const res = await POST(post(JSON.stringify(student01)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      is_career_query: true,
      max_education: "Postsecondary nondegree award",
      job_zone_ceiling: 3,
      zip_code: "22201",
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid QuizResponses without calling Claude", async () => {
    const { POST, create } = setup();
    const res = await POST(post(JSON.stringify({ ...student01, q11_zip_code: "abc" })));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects extra fields such as family income", async () => {
    const { POST, create } = setup();
    const res = await POST(post(JSON.stringify({ ...student01, family_income_tier: "Tier 2" })));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const { POST } = setup();
    expect((await POST(post("{"))).status).toBe(400);
  });

  it("caps the body size", async () => {
    const { POST, create } = setup();
    const res = await POST(post(" ".repeat(MAX_BODY_BYTES + 1)));
    expect(res.status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });

  it("caps each text answer", async () => {
    const { POST, create } = setup();
    const long = { ...student01, q3_asked_for_help: "a".repeat(MAX_TEXT_CHARS + 1) };
    const res = await POST(post(JSON.stringify(long)));
    expect(res.status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 500 when no API key is configured", async () => {
    const POST = createExtractHandler(() => null);
    expect((await POST(post(JSON.stringify(student01)))).status).toBe(500);
  });

  it("does not log prompts or responses", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const { POST } = setup();
    await POST(post(JSON.stringify(student01)));
    await setup(vi.fn().mockRejectedValue(new Error("x"))).POST(post(JSON.stringify(student01)));
    for (const s of spies) {
      expect(s).not.toHaveBeenCalled();
      s.mockRestore();
    }
  });

  it("returns a generic 502 when the API call fails", async () => {
    const { POST } = setup(vi.fn().mockRejectedValue(new Error("secret upstream detail")));
    const res = await POST(post(JSON.stringify(student01)));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("secret");
  });
});
