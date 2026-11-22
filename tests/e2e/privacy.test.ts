/**
 * Check 4, server side: what Claude receives, what is logged, and what the
 * production code can write to the browser. tests/browser/app.spec.ts covers
 * real URLs, storage and cookies.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeClient, post } from "@/app/api/recommend/test-helpers";
import { createExtractHandler } from "@/lib/extract/handler";
import { SYSTEM_PROMPT as STAGE_1_SYSTEM } from "@/lib/extract/prompt";
import { buildUserMessage as stage2Message, SYSTEM_PROMPT as STAGE_2_SYSTEM } from "@/lib/summarize/prompt";
import { BLOCKED_MESSAGE } from "../setup/block-network";
import { ALL_CASE_IDS, fixture, recommend, repo, type QuizResponses } from "./harness";

const ZIP = "20910";
const ANSWER_MARKER = "ZQANSWERMARKER";

function withMarkers(quiz: QuizResponses): QuizResponses {
  const q1 = quiz.q1_dream_job;
  return {
    ...quiz,
    q1_dream_job: q1.has_dream_job
      ? { ...q1, because: `${ANSWER_MARKER}because` }
      : { ...q1, workday_description: `${ANSWER_MARKER}workday` },
    q3_asked_for_help: `${ANSWER_MARKER}help`,
    q9_avoid: { ...quiz.q9_avoid, something_else: `${ANSWER_MARKER}avoid` },
    q11_zip_code: ZIP,
  };
}

type Call = Anthropic.MessageCreateParamsNonStreaming;
const userText = (call: Call) => String(call.messages[0].content);

afterEach(() => vi.restoreAllMocks());

describe("check 4: privacy", () => {
  it("npm test cannot reach the Claude API", async () => {
    await expect(fetch("https://api.anthropic.com/v1/messages")).rejects.toThrow(BLOCKED_MESSAGE);
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    const sdk = new Anthropic({ apiKey: "not-a-real-key", maxRetries: 0 });
    const failure = await sdk.messages
      .create({ model: "claude-haiku-5-5", max_tokens: 1, messages: [{ role: "user", content: "x" }] })
      .catch((e: unknown) => e as Error & { cause?: Error });
    expect((failure as Error & { cause?: Error }).cause?.message).toContain(BLOCKED_MESSAGE);
  });

  describe.each(ALL_CASE_IDS)("%s", (id) => {
    const f = fixture(id);

    it("ZIP stays out of Claude; answers appear only in the Stage 1 user message", async () => {
      const { create } = await recommend(f, withMarkers(f.quiz));
      const calls = create.mock.calls.map(([c]) => c);
      const stage1 = calls[0];
      expect(stage1.system).toBe(STAGE_1_SYSTEM);
      expect(stage1.messages).toHaveLength(1);
      expect(userText(stage1)).toContain(ANSWER_MARKER);
      expect(userText(stage1)).not.toContain("q11_zip_code");
      expect(JSON.stringify(calls)).not.toContain(ZIP);
      expect(JSON.stringify(calls)).not.toMatch(/family_income|income_tier/);
      expect(JSON.stringify({ ...stage1, messages: [] })).not.toContain(ANSWER_MARKER);

      if (id === "off_topic_pizza") {
        expect(calls).toHaveLength(1);
        return;
      }
      expect(calls).toHaveLength(2);
    });

    it("Stage 2 receives only the three career records", async () => {
      if (id === "off_topic_pizza") return;
      const { body, create } = await recommend(f, withMarkers(f.quiz));
      if (body.kind !== "cards") throw new Error("expected cards");
      const stage2 = create.mock.calls[1][0];
      const occupations = body.cards.map((c) => repo.getOccupation(c.soc)!);
      expect(stage2.system).toBe(STAGE_2_SYSTEM);
      expect(stage2.messages).toEqual([{ role: "user", content: stage2Message(occupations) }]);
      expect(JSON.stringify(stage2)).not.toContain(ANSWER_MARKER);
    });

    it("the response carries no ZIP or answer text, and nothing is logged", async () => {
      const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
        vi.spyOn(console, m).mockImplementation(() => {}),
      );
      const ok = await recommend(f, withMarkers(f.quiz));
      const failed = await recommend(f, withMarkers(f.quiz), { stage1: "throw" });
      expect(JSON.stringify(ok.body)).not.toContain(ANSWER_MARKER);
      expect(JSON.stringify(ok.body)).not.toContain(ZIP);
      expect(failed.body).toEqual({ error: "upstream_error" });
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    });

    it.each(["family_income", "income_tier", "race", "ethnicity", "gender", "sex", "age", "name", "email", "gpa"])(
      "a %s field is refused before Claude",
      async (field) => {
        const { status, create } = await recommend(f, { ...f.quiz, [field]: "x" });
        expect(status).toBe(400);
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  it("/api/extract also keeps the ZIP out of Claude", async () => {
    const f = fixture("student_01");
    const { client, create } = fakeClient(f.filters);
    const res = await createExtractHandler(() => client)(post({ ...f.quiz, q11_zip_code: ZIP }));
    expect(res.status).toBe(200);
    expect(JSON.stringify(create.mock.calls)).not.toContain(ZIP);
  });

  it("production code has no storage, cookie or console calls", () => {
    const files = ["app", "components", "lib"].flatMap((dir) =>
      (readdirSync(dir, { recursive: true }) as string[])
        .filter((p) => /\.tsx?$/.test(p) && !/\.test\.ts$|test-helpers|test-inputs/.test(p))
        .map((p) => join(dir, p)),
    );
    expect(files.length).toBeGreaterThan(40);
    const pattern = /\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie|\bcookies\(\)|\bconsole\.\w+\(/;
    const hits = files.filter((file) => {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      return pattern.test(code);
    });
    expect(hits).toEqual([]);
  });

  // FAIL F3 in docs/test-report.md. Remove `.fails` when s10-fixes handles typed personal details.
  it.fails("ZIP, income and demographics typed into a free-text answer never reach Claude", async () => {
    const f = fixture("student_01");
    const typed = "My ZIP is 20910, my family makes $40,000 a year, and I am a Latina girl.";
    const quiz: QuizResponses = {
      ...f.quiz,
      q1_dream_job: { has_dream_job: true, job: "Electrician", because: typed, workday_description: null },
    };
    const { create } = await recommend(f, quiz);
    const sent = JSON.stringify(create.mock.calls);
    for (const detail of ["20910", "$40,000", "Latina"]) expect(sent).not.toContain(detail);
  });
});
