/**
 * Shape of a student's values-quiz answers, as held in browser memory and
 * stored in data/fixtures/student_*.json under `quiz_responses`.
 *
 * Shared by several sessions: keep it small and stable. Only Q4 is a fixed
 * vocabulary (Q4_OPTIONS); other tap answers stay plain strings while their
 * wording is under counselor review. Family income is not a quiz answer
 * (it is asked on the results screen), so it is not here.
 */
import { z } from "zod";
import { Q4_OPTIONS, type Q4Label } from "@/lib/data/constants";

const Q4_LABELS = Q4_OPTIONS.map((o) => o.label) as [Q4Label, ...Q4Label[]];
export const Q4LabelSchema = z.enum(Q4_LABELS);

const text = z.string().min(1);
const optText = text.nullable();

const DreamJobSchema = z.discriminatedUnion("has_dream_job", [
  z.strictObject({
    has_dream_job: z.literal(true),
    job: text,
    because: optText,
    workday_description: z.null(),
  }),
  z.strictObject({
    has_dream_job: z.literal(false),
    job: z.null(),
    because: z.null(),
    workday_description: text,
  }),
]);

const ValuesMostLeastSchema = z
  .strictObject({
    most_important: z.tuple([Q4LabelSchema, Q4LabelSchema]),
    least_important: Q4LabelSchema,
  })
  .refine(
    ({ most_important: [a, b], least_important: c }) => new Set([a, b, c]).size === 3,
    "Q4 picks must be 3 different cards",
  );

export const QuizResponsesSchema = z.strictObject({
  q1_dream_job: DreamJobSchema,
  q2_activities: z.array(text).max(3),
  q3_asked_for_help: optText,
  /** null when skipped (docs/values-quiz.md, Follow-ups); otherwise all 3 picks. */
  q4_values_most_least: ValuesMostLeastSchema.nullable(),
  q5_job_pairs: z.strictObject({
    support_vs_independence: text,
    recognition_vs_relationships: text,
    working_conditions_vs_achievement: text,
  }),
  q6_work_setting: z.strictObject({ indoors_outdoors: text, desk_moving: text }),
  q7_working_with_public: text,
  q8_schedule: z.strictObject({ regularity: text, weekly_hours: text }),
  q9_avoid: z.strictObject({
    selected_flags: z.array(text),
    selected_chips: z.array(text),
    something_else: optText,
  }),
  q10_training: z.strictObject({
    max_education: text,
    apprenticeship_interest: z.boolean(),
    follow_up: optText,
  }),
  q11_zip_code: z.string().regex(/^\d{5}$/).nullable(),
});

export type QuizResponses = z.infer<typeof QuizResponsesSchema>;
