/**
 * "First step from high school" (card factor 5), one sentence per
 * training_pathway. Fixed wording, no numbers: time to first paycheck is a
 * Beta stretch item with its own reviewed table.
 *
 * DRAFT wording, pending counselor review.
 */
import type { z } from "zod";
import type { TrainingPathwaySchema } from "@/lib/data/schemas";

export type TrainingPathway = z.infer<typeof TrainingPathwaySchema>;

export const FIRST_STEP_REVIEW_STATUS = "Draft — pending counselor review";

export const FIRST_STEPS: Record<TrainingPathway, string> = {
  "Registered Apprenticeship":
    "Finish high school, then apply to a registered apprenticeship. Many take applicants right after graduation and pay you while you train.",
  "Entry-Level + Moderate-term on-the-job training":
    "Many people start right after high school in an entry-level job and learn the work on the job over several months.",
  "Entry-Level + Long-term on-the-job training":
    "Many people start right after high school in an entry-level job and build skills on the job over a longer stretch, often a year or more.",
  "Direct Entry + Short-Term OJT":
    "You can often start right after high school. Training happens on the job and is usually short.",
  "Postsecondary Certificate / License":
    "After high school, enroll in a certificate or license program at a community college or training school.",
  "2-Year Associate Degree": "After high school, start an associate degree, often at a community college.",
  "4-Year Bachelor’s Degree": "After high school, start a bachelor's degree at a college or university.",
  "Graduate / Professional Degree":
    "Start with a bachelor's degree. This career then needs a graduate or professional degree.",
  "Internship / Residency":
    "Start with a bachelor's degree. This career then needs graduate school and a supervised internship or residency.",
};

export const NEVER_TOO_LATE =
  "It's never too late. Lots of people change direction or learn new skills later on, and that's normal.";
