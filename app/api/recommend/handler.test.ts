import { describe, expect, it } from "vitest";
import { MAX_BODY_BYTES as EXTRACT_MAX_BODY_BYTES } from "@/lib/extract/handler";
import { NUDGE_MESSAGE } from "@/lib/match/selectCards";
import { createRecommendHandler, MAX_BODY_BYTES } from "./handler";
import { fakeClient, fixture, post, repo, summaryFor, type Fixture } from "./test-helpers";
import { RecommendResponseSchema } from "./types";

function setup(f: Fixture, opts: Parameters<typeof fakeClient>[1] = {}, withKey = true) {
  const { client, create } = fakeClient(f.filters, opts);
  return { POST: createRecommendHandler(() => (withKey ? client : null), () => repo), create };
}

async function okBody(res: Response) {
  expect(res.status).toBe(200);
  return RecommendResponseSchema.parse(await res.json());
}

describe("POST /api/recommend", () => {
  it("shares the Stage 1 body cap", () => {
    expect(MAX_BODY_BYTES).toBe(EXTRACT_MAX_BODY_BYTES);
  });

  it("student_01: three cards with summaries, slots, matched values and interests", async () => {
    const f = fixture("student_01");
    const { POST, create } = setup(f);
    const body = await okBody(await POST(post(f.quiz)));
    expect(create).toHaveBeenCalledTimes(2);
    if (body.kind !== "cards") throw new Error("expected cards");
    expect(body.mode).toBe("standard");
    expect(body.cards.map((c) => c.slot)).toEqual(["direct", "two_year", "adjacent"]);
    expect(new Set(body.cards.map((c) => c.soc)).size).toBe(3);
    for (const c of body.cards) {
      expect(c.summary).toMatchObject({ kind: "summary", soc_code: c.soc, summary: summaryFor(c.soc) });
      // Matched values come only from the student's own Stage 1 values.
      for (const v of c.matched_values) expect(f.filters.work_values).toContain(v);
      const riasec = repo.getOccupation(c.soc)!.work_profile.riasec_code;
      expect(c.matched_interests).toEqual(f.filters.interest_tags.filter((t) => riasec.includes(t)));
    }
    // The direct match shares at least one value or interest with the student.
    expect(body.cards[0].matched_values.length + body.cards[0].matched_interests.length).toBeGreaterThan(0);
  });

  it("every career fixture returns three cards that exist in the dataset", async () => {
    for (const id of ["student_02", "student_03", "student_04", "student_06", "student_07", "student_08", "student_09", "student_10"]) {
      const f = fixture(id);
      const body = await okBody(await setup(f).POST(post(f.quiz)));
      if (body.kind !== "cards") throw new Error(`${id}: expected cards`);
      for (const c of body.cards) expect(repo.getOccupation(c.soc), `${id} ${c.soc}`).not.toBeNull();
    }
  });

  it("off_topic_pizza: returns the nudge and makes no Stage 2 call", async () => {
    const f = fixture("off_topic_pizza");
    const { POST, create } = setup(f);
    const body = await okBody(await POST(post(f.quiz)));
    expect(body).toEqual({ kind: "nudge", message: NUDGE_MESSAGE });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("student_05: conflict mode with the closest-career label and two short-training cards", async () => {
    const f = fixture("student_05");
    const body = await okBody(await setup(f).POST(post(f.quiz)));
    if (body.kind !== "cards") throw new Error("expected cards");
    expect(body.mode).toBe("conflict");
    expect(body.cards.map((c) => c.slot)).toEqual(["closest_match", "short_training", "short_training"]);
    expect(body.cards[0].dream_job_label).toEqual({
      heading: "Closest career in our list to Surgeon",
      note: "Surgeon isn't in our career data yet.",
    });
    expect(body.cards[1].dream_job_label).toBeNull();
  });

  it("never sends the ZIP or income to Claude, in either stage", async () => {
    for (const id of ["student_01", "student_05", "student_10"]) {
      const f = fixture(id);
      expect(f.quiz.q11_zip_code).toMatch(/^\d{5}$/);
      const { POST, create } = setup(f);
      await okBody(await POST(post(f.quiz)));
      const sent = JSON.stringify(create.mock.calls);
      expect(sent).not.toContain(f.quiz.q11_zip_code);
      expect(sent).not.toMatch(/zip|income/i);
    }
  });

  it("rejects an income (or any extra) field before calling Claude", async () => {
    const f = fixture("student_01");
    const { POST, create } = setup(f);
    const res = await POST(post({ ...f.quiz, family_income: "Under $30,000" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_quiz_responses" });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a generic 503 when the API key is missing", async () => {
    const f = fixture("student_01");
    const res = await setup(f, {}, false).POST(post(f.quiz));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_configured" });
  });

  it("returns a generic 502 when Stage 1 fails, with no upstream text", async () => {
    const f = fixture("student_01");
    const res = await setup(f, { stage1: "throw" }).POST(post(f.quiz));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toBe(JSON.stringify({ error: "upstream_error" }));
  });

  it("still returns cards with task lists when Stage 2 fails", async () => {
    const f = fixture("student_01");
    const body = await okBody(await setup(f, { stage2: "throw" }).POST(post(f.quiz)));
    if (body.kind !== "cards") throw new Error("expected cards");
    for (const c of body.cards) {
      expect(c.summary).toMatchObject({ kind: "tasks", tasks: repo.getOccupation(c.soc)!.core_tasks.slice(0, 3) });
    }
  });

  it("rejects bad JSON, oversized bodies and long answers", async () => {
    const f = fixture("student_01");
    const { POST, create } = setup(f);
    expect((await POST(post("{nope"))).status).toBe(400);
    expect((await POST(post("x".repeat(MAX_BODY_BYTES + 1)))).status).toBe(413);
    const long = { ...f.quiz, q3_asked_for_help: "a".repeat(501) };
    expect((await POST(post(long))).status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });
});
