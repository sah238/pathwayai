/**
 * Q9 "avoid" flags mapped to the beta-roster careers where that thing is a
 * regular part of the work.
 *
 * DRAFT for team review (approved as a draft by Sophie on 2026-11-22). The
 * roster has no avoid_flags field and no O*NET Work Context scores for these
 * yet, so this is a hand-written judgment table: review it with the team and
 * counselors, and replace it with Work Context data in Beta stretch.
 *
 * Flags with no clear match in the roster map to an empty list and have no
 * effect. Keys are the Q9 chip flags in components/quiz/questions.ts.
 */
export const AVOID_TABLE: Record<string, readonly string[]> = {
  // Physical
  heavy_lifting: ["47-2031", "47-2152", "47-2211", "47-2231", "33-2011", "39-2021"],
  heights: ["47-2111", "47-2031", "47-2211", "47-2231", "49-9081", "33-2011"],
  cramped: ["47-2152", "47-2211", "49-9081"],
  driving: [],
  // Surroundings
  blood_medical: ["29-1141", "29-1171", "29-1071", "29-2042", "29-1131", "29-2056", "29-1292", "33-2011"],
  noise: ["47-2031", "47-2211", "49-9041"],
  temperature: ["33-2011", "35-2014", "47-2231", "49-9081"],
  contaminants: ["47-2152", "49-3023", "19-4042", "17-2081"],
  hazardous_equipment: ["47-2111", "47-2211", "49-9041", "49-9081", "33-2011"],
  computer: ["15-1252", "15-2051", "13-2011", "27-1024", "43-4051"],
  // Schedule
  night_shifts: ["29-1141", "29-2042", "33-2011"],
  weekend_holiday: ["29-1141", "29-2042", "33-2011", "35-2014"],
  // People
  angry_people: ["43-4051"],
  conflict: [],
  sales: [],
  // Pressure
  time_pressure: [],
  others_safety: ["33-2011", "29-2042", "47-2111"],
  consequence_error: [],
};

/** The student's Q9 flags that apply to this career, in the order given. */
export function avoidHits(soc: string, flags: readonly string[]): string[] {
  return flags.filter((f) => Object.hasOwn(AVOID_TABLE, f) && AVOID_TABLE[f].includes(soc));
}
