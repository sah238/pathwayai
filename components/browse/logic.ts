/**
 * Pure, client-safe browse logic: filtering and picking careers. No API calls,
 * and the selection lives only in React state.
 */
export const MAX_SELECTED = 3;

export const RIASEC_LABELS = {
  R: "Realistic (hands-on)",
  I: "Investigative (figuring things out)",
  A: "Artistic (creating)",
  S: "Social (helping people)",
  E: "Enterprising (leading)",
  C: "Conventional (organizing)",
} as const;
export type RiasecLetter = keyof typeof RIASEC_LABELS;
export const RIASEC_LETTERS = Object.keys(RIASEC_LABELS) as RiasecLetter[];

export interface BrowseCareer {
  soc_code: string;
  title: string;
  description: string;
  entry_education: string;
  job_zone: number;
  job_zone_label: string;
  riasec_code: string;
}

/** Null means "any". */
export interface BrowseFilters {
  education: string | null;
  jobZone: number | null;
  riasec: RiasecLetter | null;
}

export const NO_FILTERS: BrowseFilters = { education: null, jobZone: null, riasec: null };

/** A RIASEC letter matches anywhere in the career's three-letter code. */
export function filterCareers(careers: readonly BrowseCareer[], f: BrowseFilters): BrowseCareer[] {
  return careers.filter(
    (c) =>
      (f.education === null || c.entry_education === f.education) &&
      (f.jobZone === null || c.job_zone === f.jobZone) &&
      (f.riasec === null || c.riasec_code.includes(f.riasec)),
  );
}

/** Adds or removes a SOC; adding past the limit changes nothing. */
export function toggleSelected(selected: readonly string[], soc: string): string[] {
  if (selected.includes(soc)) return selected.filter((s) => s !== soc);
  return selected.length < MAX_SELECTED ? [...selected, soc] : [...selected];
}

/** /results needs exactly three careers, so there is no link until then. */
export function resultsHref(selected: readonly string[]): string | null {
  return selected.length === MAX_SELECTED ? `/results?socs=${selected.join(",")}` : null;
}

/** "Job Zone Three: Medium Preparation Needed" -> "Medium preparation needed". */
export function plainJobZoneLabel(label: string): string {
  const text = label.replace(/^Job Zone [^:]+:\s*/, "");
  return text.charAt(0) + text.slice(1).toLowerCase();
}
