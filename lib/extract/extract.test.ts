import { readFileSync, readdirSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { Q4_OPTIONS } from "@/lib/data/constants";
import { QuizResponsesSchema, type QuizResponses } from "@/lib/quiz/responses";
import {
  buildRequest,
  EXTRACT_MAX_TOKENS,
  EXTRACT_MODEL,
  ExtractError,
  extractFilters,
  type MessagesClient,
} from "./extract";
import { SYSTEM_PROMPT } from "./prompt";
import { ExtractedFiltersSchema, type ModelOutput } from "./schema";
import { EDGE_CASES } from "./test-inputs";
import { Q10_TRAINING_TABLE, trainingCeiling } from "./training";

const FIXTURE_DIR = "data/fixtures";
const fixtures: QuizResponses[] = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(`${FIXTURE_DIR}/${f}`, "utf8")).quiz_responses);
const student01 = QuizResponsesSchema.parse(fixtures[0]);

const GOOD: ModelOutput = {
  is_career_query: true,
  has_constraint_conflict: false,
  interest_tags: ["R", "I"],
  work_values: ["working_conditions", "achievement"],
  work_context: ["Outdoors", "Physical/Active"],
};

function message(text: string, stop_reason: Anthropic.StopReason = "end_turn"): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: EXTRACT_MODEL,
    stop_reason,
    stop_sequence: null,
    content: [{ type: "text", text, citations: null }],
    usage: { input_tokens: 1, output_tokens: 1 },
  } as Anthropic.Message;
}

function fakeClient(reply: Anthropic.Message) {
  const create = vi.fn().mockResolvedValue(reply);
  return { client: { messages: { create } } as unknown as MessagesClient, create };
}

describe("buildRequest", () => {
  const req = buildRequest(student01);
  const user = JSON.stringify(req.messages);

  it("uses Haiku with a max_tokens cap and a JSON schema output format", () => {
    expect(req.model).toBe("claude-haiku-5-5");
    expect(req.max_tokens).toBe(EXTRACT_MAX_TOKENS);
    expect(req.max_tokens).toBeLessThanOrEqual(4096);
    expect(req.output_config?.format?.type).toBe("json_schema");
  });

  it("keeps student text out of the system prompt", () => {
    expect(req.system).toBe(SYSTEM_PROMPT);
    for (const f of fixtures) {
      expect(SYSTEM_PROMPT).not.toContain(f.q3_asked_for_help ?? "\u0000");
      expect(SYSTEM_PROMPT).not.toContain(f.q1_dream_job.because ?? "\u0000");
    }
    expect(user).toContain(student01.q3_asked_for_help!);
  });

  it("never sends the ZIP code, income or fixture metadata", () => {
    for (const f of fixtures) {
      const sent = JSON.stringify(buildRequest(QuizResponsesSchema.parse(f)));
      expect(sent).not.toContain("q11_zip_code");
      if (f.q11_zip_code) expect(sent).not.toContain(f.q11_zip_code);
      expect(sent).not.toMatch(/income|Tier \d|profile_id|metadata/i);
    }
  });

  it("lists every allowed vocabulary in the prompt", () => {
    for (const o of Q4_OPTIONS) expect(SYSTEM_PROMPT).toContain(o.label);
    expect(SYSTEM_PROMPT).toContain("curiosity");
  });
});

describe("extractFilters", () => {
  it("returns validated filters with code-set ceilings and the ZIP from the request", async () => {
    const { client, create } = fakeClient(message(JSON.stringify(GOOD)));
    const out = await extractFilters(client, student01);
    expect(create).toHaveBeenCalledTimes(1);
    expect(ExtractedFiltersSchema.parse(out)).toEqual({
      ...GOOD,
      max_education: "Postsecondary nondegree award",
      job_zone_ceiling: 3,
      zip_code: "22201",
    });
  });

  it("rejects output where the model adds its own education or Job Zone", async () => {
    const extra = { ...GOOD, max_education: "Doctoral or professional degree" };
    const { client } = fakeClient(message(JSON.stringify(extra)));
    await expect(extractFilters(client, student01)).rejects.toThrow(ExtractError);
  });

  it("accepts curiosity as a work value", async () => {
    const { client } = fakeClient(message(JSON.stringify({ ...GOOD, work_values: ["curiosity"] })));
    expect((await extractFilters(client, student01)).work_values).toEqual(["curiosity"]);
  });

  it("dedupes and caps lists at 3", async () => {
    const noisy = { ...GOOD, interest_tags: ["R", "R", "I", "A", "S"] };
    const { client } = fakeClient(message(JSON.stringify(noisy)));
    expect((await extractFilters(client, student01)).interest_tags).toEqual(["R", "I", "A"]);
  });

  it.each([
    ["an off-list work value", { ...GOOD, work_values: ["prestige"] }],
    ["an off-list interest tag", { ...GOOD, interest_tags: ["X"] }],
    ["an off-list work context", { ...GOOD, work_context: ["Underwater"] }],
    ["a missing flag", { ...GOOD, is_career_query: undefined }],
  ])("rejects %s", async (_name, bad) => {
    const { client } = fakeClient(message(JSON.stringify(bad)));
    await expect(extractFilters(client, student01)).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("rejects non-JSON text", async () => {
    const { client } = fakeClient(message("not json"));
    await expect(extractFilters(client, student01)).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("maps refusal and max_tokens stop reasons to errors", async () => {
    const refused = fakeClient(message("", "refusal")).client;
    await expect(extractFilters(refused, student01)).rejects.toMatchObject({ code: "refusal" });
    const cut = fakeClient(message('{"is_career', "max_tokens")).client;
    await expect(extractFilters(cut, student01)).rejects.toMatchObject({ code: "truncated" });
  });
});

describe("Q10 training table", () => {
  it("covers every Q10 option used in the fixtures", () => {
    for (const f of fixtures) {
      expect(Object.keys(Q10_TRAINING_TABLE)).toContain(f.q10_training.max_education);
    }
  });

  it("uses the stored hyphen and returns null for unknown values", () => {
    expect(trainingCeiling("About 1-2 years").job_zone_ceiling).toBe(3);
    expect(trainingCeiling("About 1–2 years")).toEqual({ max_education: null, job_zone_ceiling: null });
    expect(trainingCeiling("Not sure yet")).toEqual({ max_education: null, job_zone_ceiling: null });
    expect(trainingCeiling("toString")).toEqual({ max_education: null, job_zone_ceiling: null });
  });

  it("lets 'Start working right away' reach Job Zone 3 apprenticeships", () => {
    expect(trainingCeiling("Start working right away")).toEqual({
      max_education: "High school diploma or equivalent",
      job_zone_ceiling: 3,
    });
  });
});

describe("edge-case inputs", () => {
  it("are valid QuizResponses", () => {
    for (const c of EDGE_CASES) expect(QuizResponsesSchema.safeParse(c.input).success).toBe(true);
  });
});
