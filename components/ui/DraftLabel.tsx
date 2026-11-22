import { FIRST_STEP_REVIEW_STATUS } from "@/app/results/first-steps";

/** Visible review label for draft wording, in the same words as the first-step sentences. */
export function DraftLabel({ className = "" }: { className?: string }) {
  return <p className={`text-xs text-body ${className}`}>Wording: {FIRST_STEP_REVIEW_STATUS.toLowerCase()}.</p>;
}
