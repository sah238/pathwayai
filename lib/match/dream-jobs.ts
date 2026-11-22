/**
 * Dream-job words the roster has no title for, mapped to the nearest beta
 * roster careers. Used only for the title bonus (./score.ts, titleMatches).
 *
 * DRAFT for team review (added 2026-11-22 alongside the Q9 avoid table).
 * Without it, "Surgeon" matches nothing and the conflict real path falls to
 * whatever scores highest on RIASEC alone. Keep entries few and obvious; each
 * key is matched as whole words, ignoring case.
 *
 * An alias match is only "closest in our list", never the student's actual
 * job: a conflict card found this way is labeled closest_match, not real_path
 * (see selectCards.ts, dreamJobLabel).
 */
export const DREAM_JOB_ALIASES: Record<string, readonly string[]> = {
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
