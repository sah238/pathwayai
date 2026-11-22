/**
 * Fixed prompts for the printable counselor guide (CLAUDE.md → The guide
 * layer). No student data goes into these; the student writes answers by hand.
 * Family expectations appear here only and never feed matching.
 *
 * DRAFT wording, pending counselor review (CLAUDE.md open question).
 */
export const GUIDE_REVIEW_STATUS = "Draft — pending counselor review";

export const STRENGTHS_PROMPTS = [
  "Something I'm good at, in school or outside it:",
  "Something that's hard for me right now:",
  "A skill I want to build next:",
] as const;

export const PIVOT_NOTE =
  "Changing your mind later is normal. Many people switch paths or go back to learn something new.";

export const COUNSELOR_QUESTIONS = [
  "Which of these careers fits what you know about me?",
  "What classes or activities could help me try one out?",
  "What does the first step after high school look like for each one?",
  "How do I find out what school or training would actually cost my family?",
] as const;

export const FAMILY_QUESTIONS = [
  "What do you hope I'll do after high school, and why?",
  "Which of these careers surprised you, and what would you want to know more about?",
] as const;
