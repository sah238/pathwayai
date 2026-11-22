/**
 * The Stage 2 number check (CLAUDE.md rule 1): every number in a summary must
 * appear in the text Claude was given for that career. Values are compared, so
 * "12", "12.0" and "twelve" are the same number and "$1,500" equals "1500".
 *
 * It errs toward rejecting: a rejected summary only falls back to the task list.
 * Ordinals are not counted because "first" and "second" are ordinary words.
 */
const WORD_VALUES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1_000,
  million: 1_000_000, billion: 1_000_000_000, dozen: 12, half: 0.5, quarter: 0.25,
};

const SCALES: Record<string, number> = {
  k: 1_000, m: 1_000_000, b: 1_000_000_000,
  thousand: 1_000, million: 1_000_000, billion: 1_000_000_000,
};

/** A digit number, with an attached k/m/b or a following scale word. */
const DIGITS = /(\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)(?:([kmb])\b|\s+(thousand|million|billion)\b)?/gi;
const WORDS = new RegExp(`\\b(${Object.keys(WORD_VALUES).join("|")})\\b`, "gi");
/** "one" here is a pronoun, not a count. */
const PRONOUN_ONE = /\bno one\b|\bone another\b/gi;

/** Every numeric value in the text. NFKC turns full-width digits and ½ into plain digits. */
export function findNumbers(text: string): number[] {
  const found: number[] = [];
  const withoutDigits = text.normalize("NFKC").replace(DIGITS, (_match, num: string, short?: string, word?: string) => {
    const scale = SCALES[(short ?? word ?? "").toLowerCase()] ?? 1;
    found.push(Number(num.replaceAll(",", "")) * scale);
    return " ";
  });
  for (const [word] of withoutDigits.replace(PRONOUN_ONE, " ").matchAll(WORDS)) {
    found.push(WORD_VALUES[word.toLowerCase()]);
  }
  return found;
}

/** True when every number in `summary` also appears in one of the source texts. */
export function numbersAreGrounded(summary: string, sources: readonly string[]): boolean {
  const allowed = new Set(sources.flatMap(findNumbers));
  return findNumbers(summary).every((n) => allowed.has(n));
}
