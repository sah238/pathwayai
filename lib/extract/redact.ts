/**
 * Best-effort removal of personal details a student types into a free-text
 * answer, applied to the copy sent to Stage 1. Pattern matching cannot catch
 * every phrasing (for example spelled-out amounts, or nationalities), so the
 * quiz also asks students not to include these details.
 *
 * Demographic words are removed only when the student describes themself
 * ("I am a Latina girl"). Career interests ("teach Black history", "women's
 * health") stay. The term lists are a draft for team review.
 */
import type { QuizResponses } from "@/lib/quiz/responses";

export const REDACTED = "[removed]";

const AMOUNT = String.raw`\d+(?:,\d{3})*(?:\.\d+)?`;

const DOLLARS = new RegExp(String.raw`\$\s*${AMOUNT}(?:\s*(?:k|thousand|million)\b)?`, "gi");
// 401k is a retirement plan, not an amount.
const WORD_AMOUNT = new RegExp(String.raw`\b(?!401\s*k\b)${AMOUNT}\s*(?:k|grand|thousand|million|dollars?|bucks)\b`, "gi");
const PAY_RATE = new RegExp(String.raw`\b${AMOUNT}\s*(?:an?|per)\s*(?:hour|hr|week|month|year|yr)\b`, "gi");
const COMMA_NUMBER = /\b\d{1,3}(?:,\d{3})+\b/g;
const ZIP = /\b\d{5}(?:-\d{4})?\b/g;
const INCOME_FIGURE =
  /\b((?:income|salary|makes?|making|made|earns?|earning|earned|paid)(?:\s+(?:is|of|about|around|like|only|roughly|maybe))*\s+)\d{4,}\b/gi;

const TERMS = [
  "african[\\s-]american",
  "asian[\\s-]american",
  "native[\\s-]american",
  "pacific[\\s-]islander",
  "middle[\\s-]eastern",
  "mixed[\\s-]race",
  "hispanic",
  "latina",
  "latino",
  "latinx",
  "latine",
  "black",
  "white",
  "asian",
  "indigenous",
  "arab",
  "biracial",
  "multiracial",
  "caucasian",
  "transgender",
  "trans",
  "non[\\s-]?binary",
  "female",
  "male",
  "woman",
  "man",
  "girl",
  "boy",
  "guy",
].join("|");

/** Words that turn a demographic term into a subject or phrase, such as "Black history" or "white-collar". */
const NOT_SELF =
  String.raw`(?![-'’]\w)(?!\s+(?:history|studies|literature|health|culture|music|art|belt|hat|collar|box|board|house)\b)`;
const TERM = String.raw`(?:${TERMS})\b${NOT_SELF}`;
const TERM_CHAIN = String.raw`${TERM}(?:(?:\s*,\s*|\s+and\s+|\s*/\s*|\s+)${TERM})*`;

const SELF_DESCRIPTION = new RegExp(
  String.raw`(\b(?:i\s+am|i['’]?m|im|i\s+identify\s+as|my\s+(?:race|ethnicity|gender)\s+is)\s+(?:an?\s+)?|(?:^|[.!?]\s+)as\s+an?\s+)${TERM_CHAIN}`,
  "gi",
);

export function redactText(text: string): string {
  return text
    .replace(DOLLARS, REDACTED)
    .replace(WORD_AMOUNT, REDACTED)
    .replace(PAY_RATE, REDACTED)
    .replace(COMMA_NUMBER, REDACTED)
    .replace(ZIP, REDACTED)
    .replace(INCOME_FIGURE, `$1${REDACTED}`)
    .replace(SELF_DESCRIPTION, `$1${REDACTED}`);
}

const redactOptional = (text: string | null) => (text === null ? null : redactText(text));

/** A copy of the answers with every typed field redacted. Tap answers are fixed wording and stay as they are. */
export function redactFreeText(responses: QuizResponses): QuizResponses {
  const q1 = responses.q1_dream_job;
  return {
    ...responses,
    q1_dream_job: q1.has_dream_job
      ? { ...q1, job: redactText(q1.job), because: redactOptional(q1.because) }
      : { ...q1, workday_description: redactText(q1.workday_description) },
    q3_asked_for_help: redactOptional(responses.q3_asked_for_help),
    q9_avoid: { ...responses.q9_avoid, something_else: redactOptional(responses.q9_avoid.something_else) },
  };
}
