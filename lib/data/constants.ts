/** Fixed vocabularies shared by the schemas, the audit and (later) the app. */

export const DMV_STATES = ["DC", "MD", "VA"] as const;
export type DmvState = (typeof DMV_STATES)[number];

/** The six O*NET Work Values, as keys of `work_values.scores` in occupations.json. */
export const ONET_WORK_VALUES = [
  "achievement",
  "independence",
  "recognition",
  "relationships",
  "support",
  "working_conditions",
] as const;
export type OnetWorkValue = (typeof ONET_WORK_VALUES)[number];

/** Q4 value keys: the six O*NET Work Values plus Curiosity (not an O*NET value). */
export type Q4Value = OnetWorkValue | "curiosity";

/**
 * Quiz Q4 card labels, word for word from docs/values-quiz.md, mapped to the
 * value each one reads. The label is reused on "Why it fits you".
 */
export const Q4_OPTIONS: ReadonlyArray<{ label: string; value: Q4Value }> = [
  { label: "See the results of my work", value: "achievement" },
  { label: "Decide for myself how to do things", value: "independence" },
  { label: "Get noticed and move up", value: "recognition" },
  { label: "Help people and work with people I like", value: "relationships" },
  { label: "Have a boss and company that support me", value: "support" },
  { label: "Good pay and steady work", value: "working_conditions" },
  {
    label: "Keep learning new skills and discover things no one knows yet",
    value: "curiosity",
  },
];
