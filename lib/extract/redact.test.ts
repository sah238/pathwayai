import { describe, expect, it } from "vitest";
import { fixture } from "@/app/api/recommend/test-helpers";
import { buildUserMessage } from "./prompt";
import { REDACTED, redactFreeText, redactText } from "./redact";

describe("redactText removes", () => {
  it.each([
    ["My ZIP is 20910.", "My ZIP is [removed]."],
    ["I live in 20910-1234", "I live in [removed]"],
    ["we make $40,000 a year", "we make [removed] a year"],
    ["about $ 55.5k", "about [removed]"],
    ["my mom earns 40k", "my mom earns [removed]"],
    ["maybe 60 thousand", "maybe [removed]"],
    ["we have 900 dollars", "we have [removed]"],
    ["she gets 18 an hour", "she gets [removed]"],
    ["income is 85,000", "income is [removed]"],
    ["my dad makes 9000", "my dad makes [removed]"],
    ["I am a Latina girl.", "I am a [removed]."],
    ["I'm Black and Latino", "I'm [removed]"],
    ["I’m an Asian American guy who codes", "I’m an [removed] who codes"],
    ["As a Black student, I want to help", "As a [removed] student, I want to help"],
    ["I identify as nonbinary", "I identify as [removed]"],
    ["my gender is female", "my gender is [removed]"],
  ])("%s", (input, expected) => {
    expect(redactText(input)).toBe(expected);
  });
});

describe("redactText keeps", () => {
  it.each([
    "I want to teach Black history",
    "I want to work in women's health",
    "I'm a Black history teacher",
    "I'm a woman's health advocate",
    "I'm a woman’s health advocate",
    "Latina moms in my neighborhood ask me for help",
    "I'd work as a male nurse",
    "I want a white-collar job",
    "I'm a black belt in karate",
    "I'm interested in manufacturing",
    "I'm a manager at the store",
    "I want a 401k",
    "I want to work 40 hours a week",
    "I'd wake up around 8 and be done by 5.",
    "I like 3D printing",
    "I want to work 24/7 shifts as a 911 dispatcher",
  ])("%s", (text) => {
    expect(redactText(text)).toBe(text);
  });
});

describe("redactFreeText", () => {
  const quiz = fixture("student_01").quiz;

  it("covers every typed field and leaves tap answers alone", () => {
    const typed = "My ZIP is 20910";
    const out = redactFreeText({
      ...quiz,
      q1_dream_job: { has_dream_job: true, job: typed, because: typed, workday_description: null },
      q3_asked_for_help: typed,
      q9_avoid: { ...quiz.q9_avoid, something_else: typed },
      q8_schedule: { ...quiz.q8_schedule, weekly_hours: "Usually 40 or less" },
    });
    expect(JSON.stringify(out)).not.toContain("20910");
    expect(out.q3_asked_for_help).toContain(REDACTED);
    expect(out.q8_schedule.weekly_hours).toBe("Usually 40 or less");
  });

  it("covers the workday answer", () => {
    const out = redactFreeText({
      ...quiz,
      q1_dream_job: { has_dream_job: false, job: null, because: null, workday_description: "Near 22201 please" },
    });
    expect(out.q1_dream_job.workday_description).toBe("Near [removed] please");
  });

  it("does not change the object it was given", () => {
    const input = { ...quiz, q3_asked_for_help: "My ZIP is 20910" };
    redactFreeText(input);
    expect(input.q3_asked_for_help).toBe("My ZIP is 20910");
  });

  it("is applied to the Stage 1 user message", () => {
    expect(buildUserMessage({ ...quiz, q3_asked_for_help: "My ZIP is 20910" })).not.toContain("20910");
  });
});
