/**
 * Plain-sentence edge-case prompts wrapped into QuizResponses with neutral
 * filler, so the sentence is the only signal. Used by the live fixtures script.
 */
import type { QuizResponses } from "@/lib/quiz/responses";

function neutral(
  q1: QuizResponses["q1_dream_job"],
  maxEducation: string,
): QuizResponses {
  return {
    q1_dream_job: q1,
    q2_activities: [],
    q3_asked_for_help: null,
    q4_values_most_least: null,
    q5_job_pairs: {
      support_vs_independence: "No preference",
      recognition_vs_relationships: "No preference",
      working_conditions_vs_achievement: "No preference",
    },
    q6_work_setting: { indoors_outdoors: "No preference", desk_moving: "No preference" },
    q7_working_with_public: "Not sure",
    q8_schedule: { regularity: "No preference", weekly_hours: "No preference" },
    q9_avoid: { selected_flags: [], selected_chips: [], something_else: null },
    q10_training: { max_education: maxEducation, apprenticeship_interest: false, follow_up: null },
    q11_zip_code: null,
  };
}

export interface EdgeCase {
  id: string;
  input: QuizResponses;
  expect: { is_career_query: boolean; has_constraint_conflict: boolean };
}

export const EDGE_CASES: EdgeCase[] = [
  {
    id: "off_topic_pizza",
    input: neutral(
      {
        has_dream_job: false,
        job: null,
        because: null,
        workday_description: "what's the best pizza topping",
      },
      "Not sure yet",
    ),
    expect: { is_career_query: false, has_constraint_conflict: false },
  },
  {
    id: "conflict_surgeon",
    input: neutral(
      {
        has_dream_job: true,
        job: "Surgeon",
        because: "I want to be a surgeon with zero years of school",
        workday_description: null,
      },
      "Start working right away",
    ),
    expect: { is_career_query: true, has_constraint_conflict: true },
  },
];
