/**
 * Dream-job words the roster has no title for, in two lists. Both are used
 * only for the title bonus (./score.ts, dreamJobMatches). Each key is matched
 * as whole words, ignoring case. Keep entries few and obvious.
 *
 * DRAFT for team review, both lists (added 2026-11-22 alongside the Q9 avoid
 * table; split into synonyms and stand-ins 2026-11-22).
 */

/**
 * Synonyms: exact equivalents of one roster career. They count as that
 * career's own title (treated like a lay title), so the card is a title
 * match with no closest-match label, and a conflict card 1 is real_path.
 * Like lay titles, a one-word synonym is a title only as the whole dream job.
 *
 * DRAFT for team review.
 */
export const DREAM_JOB_SYNONYMS: Record<string, string> = {
  "car mechanic": "49-3023",
};

/**
 * Stand-ins: jobs the roster doesn't have, mapped to the nearest roster
 * careers. Used only when no roster career matches by title or synonym.
 * A stand-in is only "closest in our list", never the student's actual job:
 * every card matched this way carries the closest-match label, and a
 * conflict card 1 found this way is closest_match, not real_path (see
 * selectCards.ts, dreamJobLabel). Without them, "Surgeon" matches nothing
 * and the conflict card falls to whatever scores highest on RIASEC alone.
 *
 * DRAFT for team review.
 */
export const DREAM_JOB_STAND_INS: Record<string, readonly string[]> = {
  surgeon: ["29-1071", "29-1171"],
  doctor: ["29-1071", "29-1171"],
  physician: ["29-1071", "29-1171"],
  nurse: ["29-1141"],
  chef: ["35-2014"],
  vet: ["29-1131"],
  cybersecurity: ["15-1252"],
  programmer: ["15-1252"],
  coder: ["15-1252"],
};
