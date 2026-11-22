import { readFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { repositoryFromRaw } from "@/lib/data/repository";
import { createSummarizeHandler, MAX_BODY_BYTES } from "./handler";
import { buildRequest, MAX_SUMMARY_CHARS, SUMMARIZE_MODEL, type MessagesClient } from "./summarize";

const repo = repositoryFromRaw(
  JSON.parse(readFileSync("data/occupations.json", "utf8")),
  JSON.parse(readFileSync("data/institutions.json", "utf8")),
);
const occupations = repo.listOccupations().slice(0, 3);
const socs = occupations.map((o) => o.soc_code);
const good = (soc: string) => ({ soc_code: soc, summary: `You handle the daily work of career ${soc.replace(/\d/g, "x")}.` });

function reply(summaries: unknown, stop_reason = "end_turn") {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: SUMMARIZE_MODEL,
    stop_reason,
    stop_sequence: null,
    content: [{ type: "text", citations: null, text: JSON.stringify({ summaries }) }],
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

function setup(create = vi.fn().mockResolvedValue(reply(socs.map(good)))) {
  const client = { messages: { create } } as unknown as MessagesClient;
  return { POST: createSummarizeHandler(() => client, () => repo), create };
}

function post(body: string): Request {
  return new Request("http://localhost/api/summarize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

async function careers(res: Response) {
  expect(res.status).toBe(200);
  return (await res.json()).careers as Array<Record<string, unknown>>;
}

const firstTasks = (i: number) => occupations[i].core_tasks.slice(0, 3);

describe("POST /api/summarize", () => {
  it("returns a checked summary with its source for each career, in request order", async () => {
    const { POST, create } = setup();
    const out = await careers(await POST(post(JSON.stringify({ socs }))));
    expect(out.map((c) => c.soc_code)).toEqual(socs);
    expect(out.every((c) => c.kind === "summary")).toBe(true);
    for (const c of out) {
      expect(c.source).toMatchObject({ data_vintage: expect.any(String), source_url: expect.any(String) });
    }
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("sends only each record's SOC, title and core tasks", () => {
    const req = buildRequest(occupations);
    const content = req.messages[0].content as string;
    const sent = JSON.parse(content.replace("<careers>", "").replace("</careers>", ""));
    expect(sent).toEqual(
      occupations.map((o) => ({ soc_code: o.soc_code, career_title: o.career_title, core_tasks: o.core_tasks })),
    );
    expect(content).not.toContain(String(occupations[0].national_wages_2025.median_50th));
    expect(req.system).not.toContain(occupations[0].career_title);
  });

  it("drops only the summary with an ungrounded number", async () => {
    const bad = { soc_code: socs[1], summary: "You earn $90,000 doing this." };
    const { POST } = setup(vi.fn().mockResolvedValue(reply([good(socs[0]), bad, good(socs[2])])));
    const out = await careers(await POST(post(JSON.stringify({ socs }))));
    expect(out.map((c) => c.kind)).toEqual(["summary", "tasks", "summary"]);
    expect(out[1].tasks).toEqual(firstTasks(1));
    expect(out[1]).not.toHaveProperty("summary");
  });

  it("does not treat the SOC code's digits as allowed numbers", async () => {
    const bad = { soc_code: socs[0], summary: `You do ${socs[0]} work.` };
    const { POST } = setup(vi.fn().mockResolvedValue(reply([bad, good(socs[1]), good(socs[2])])));
    const out = await careers(await POST(post(JSON.stringify({ socs }))));
    expect(out[0].kind).toBe("tasks");
  });

  it.each([
    ["a missing career", [good(socs[0]), good(socs[1])], 2],
    ["an empty summary", [good(socs[0]), good(socs[1]), { soc_code: socs[2], summary: "  " }], 2],
    ["an overlong summary", [good(socs[0]), good(socs[1]), { soc_code: socs[2], summary: "a".repeat(MAX_SUMMARY_CHARS + 1) }], 2],
    ["a career returned twice", [good(socs[0]), good(socs[1]), good(socs[2]), good(socs[2])], 2],
  ])("falls back for %s", async (_name, summaries, index) => {
    const { POST } = setup(vi.fn().mockResolvedValue(reply(summaries)));
    const out = await careers(await POST(post(JSON.stringify({ socs }))));
    expect(out[index].tasks).toEqual(firstTasks(index));
  });

  it.each(["refusal", "max_tokens"])("falls back for all three on stop reason %s", async (stop) => {
    const { POST } = setup(vi.fn().mockResolvedValue(reply(socs.map(good), stop)));
    const out = await careers(await POST(post(JSON.stringify({ socs }))));
    expect(out.every((c) => c.kind === "tasks")).toBe(true);
  });

  it("falls back for all three on an API error without exposing it", async () => {
    const { POST } = setup(vi.fn().mockRejectedValue(new Error("secret upstream detail")));
    const res = await POST(post(JSON.stringify({ socs })));
    const text = await res.clone().text();
    expect(text).not.toContain("secret");
    expect((await careers(res)).every((c) => c.kind === "tasks")).toBe(true);
  });

  it("falls back when no API key is configured", async () => {
    const POST = createSummarizeHandler(() => null, () => repo);
    const out = await careers(await POST(post(JSON.stringify({ socs }))));
    expect(out.every((c) => c.kind === "tasks")).toBe(true);
  });

  it.each([
    ["two codes", { socs: socs.slice(0, 2) }],
    ["four codes", { socs: [...socs, "11-1111"] }],
    ["repeated codes", { socs: [socs[0], socs[0], socs[1]] }],
    ["a malformed code", { socs: [socs[0], socs[1], "abc"] }],
    ["an extra field", { socs, zip: "22201" }],
  ])("rejects %s without calling Claude", async (_name, body) => {
    const { POST, create } = setup();
    const res = await POST(post(JSON.stringify(body)));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 404 for a well-formed unknown SOC", async () => {
    const { POST, create } = setup();
    const res = await POST(post(JSON.stringify({ socs: [socs[0], socs[1], "99-9999"] })));
    expect(res.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON and oversized bodies", async () => {
    const { POST, create } = setup();
    expect((await POST(post("{"))).status).toBe(400);
    expect((await POST(post("x".repeat(MAX_BODY_BYTES + 1)))).status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });
});
