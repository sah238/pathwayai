/**
 * What the quiz shows after Finish: a wait message, the off-topic nudge, or a
 * friendly error that points to /browse. Successful results navigate away, so
 * they have no screen here.
 *
 * Student-facing wording here is DRAFT, pending counselor review.
 */
import Link from "next/link";
import type { RefObject } from "react";
import { buttonStyles } from "@/components/ui/button";
import { DraftLabel } from "@/components/ui/DraftLabel";
import { pageIntro, pageTitle } from "@/components/ui/surface";
import type { SubmitOutcome } from "./submit";

export type FinishOutcome = { kind: "loading" } | Exclude<SubmitOutcome, { kind: "cards" }>;

export const ERROR_HEADING = "We couldn’t match careers right now";
export const ERROR_BODY =
  "Something went wrong on our side. You can still look through every career in our list and filter them yourself.";

interface FinishScreenProps {
  outcome: FinishOutcome;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onStartOver: () => void;
  onRetry: () => void;
}

const headingClass = pageTitle;
const bodyClass = pageIntro;

export function FinishScreen({ outcome, headingRef, onBack, onStartOver, onRetry }: FinishScreenProps) {
  switch (outcome.kind) {
    case "loading":
      return (
        <>
          <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
            Thanks, that&apos;s everything!
          </h1>
          <p role="status" className={bodyClass}>
            Finding three careers for you. This can take up to a minute.
          </p>
          <DraftLabel />
        </>
      );
    case "nudge":
      return (
        <>
          <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
            Let&apos;s talk about careers
          </h1>
          <p className={bodyClass}>{outcome.message}</p>
          <DraftLabel />
          <div className="flex flex-wrap gap-3">
            <button type="button" className={buttonStyles.compact} onClick={onBack}>
              Back to the quiz
            </button>
            <button type="button" className={buttonStyles.secondary} onClick={onStartOver}>
              Start over
            </button>
          </div>
        </>
      );
    case "error":
      return (
        <>
          <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
            {ERROR_HEADING}
          </h1>
          <p role="alert" className={bodyClass}>
            {ERROR_BODY}
          </p>
          <DraftLabel />
          <div className="flex flex-wrap gap-3">
            <Link href="/browse" className={buttonStyles.compact}>
              Browse careers
            </Link>
            <button type="button" className={buttonStyles.secondary} onClick={onRetry}>
              Try again
            </button>
            <button type="button" className={buttonStyles.secondary} onClick={onBack}>
              Back to my answers
            </button>
          </div>
        </>
      );
  }
}
