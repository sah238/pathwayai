"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { primaryButton, secondaryButton } from "./buttons";
import { ProgressBar } from "./controls";
import { FinishScreen, type FinishOutcome } from "./FinishScreen";
import { setHandoff } from "./recommend-store";
import { resultsUrl, submitQuiz } from "./submit";
import { buildQuizResponses, canAdvance, followUpsFor, initialState, makeOrder, type QuizState } from "./logic";
import { TOTAL_QUESTIONS } from "./questions";
import { FollowUpScreen, HEADING_ID, promptFor, QuestionScreen } from "./screens";

const LAST_QUESTION = TOTAL_QUESTIONS - 1;

/**
 * The values quiz. Answers live only in this component's state and are never
 * written to storage or cookies. At Finish they are sent once to
 * /api/recommend (request body only), and the results page link carries only
 * the three career codes.
 */
export function Quiz() {
  // null until "Start": the shuffled order is made in a click handler, so the
  // server-rendered HTML and the first client render always match.
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [rawStep, setStep] = useState(0);
  const [seed, setSeed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState<FinishOutcome>({ kind: "loading" });
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const started = quiz !== null;

  useEffect(() => {
    // Move focus to the new question so screen readers announce it.
    if (moved.current) headingRef.current?.focus();
  }, [rawStep, finished, started, outcome]);

  const goTo = (next: number) => {
    moved.current = true;
    setSeed(Math.random()); // re-roll the placeholder examples
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const start = () => {
    moved.current = true;
    setQuiz(initialState(makeOrder()));
    setSeed(Math.random());
    setStep(0);
    setFinished(false);
  };

  if (quiz === null) {
    return (
      <Shell>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none">
          Find careers that fit you
        </h1>
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          Answer {TOTAL_QUESTIONS} quick questions about what you like and what matters to you. It takes about 5
          minutes. There are no right or wrong answers.
        </p>
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          We don&apos;t ask for your name, and your answers aren&apos;t saved.
        </p>
        <button type="button" className={`${primaryButton} self-start`} onClick={start}>
          Start the quiz
        </button>
      </Shell>
    );
  }

  const update = (fn: (s: QuizState) => QuizState) => setQuiz((s) => (s ? fn(s) : s));
  const followUps = followUpsFor(quiz);
  const lastStep = LAST_QUESTION + followUps.length;
  // The follow-up list can shrink if the student goes back and changes an answer.
  const step = Math.min(rawStep, lastStep);
  const followUp = step > LAST_QUESTION ? followUps[step - LAST_QUESTION - 1] : undefined;

  const finish = async () => {
    const responses = buildQuizResponses(quiz);
    moved.current = true;
    setFinished(true);
    setOutcome({ kind: "loading" });
    // Answers go only in the request body; nothing is stored or logged.
    const result = await submitQuiz(responses);
    if (result.kind === "cards") {
      setHandoff({ socs: result.socs, zip: responses.q11_zip_code, cards: result.cards });
      router.push(resultsUrl(result.socs));
      return;
    }
    moved.current = true;
    setOutcome(result);
  };

  if (finished) {
    const backToAnswers = () => {
      moved.current = true;
      setFinished(false);
    };
    return (
      <Shell>
        <FinishScreen
          outcome={outcome}
          headingRef={headingRef}
          onBack={backToAnswers}
          onStartOver={start}
          onRetry={() => void finish()}
        />
      </Shell>
    );
  }

  const progressLabel = followUp
    ? `A couple more quick ones: ${step - LAST_QUESTION} of ${followUps.length}`
    : `Question ${step + 1} of ${TOTAL_QUESTIONS}`;
  const ok = canAdvance(quiz, step);
  const isLast = step === lastStep;

  return (
    <Shell>
      <ProgressBar
        value={followUp ? TOTAL_QUESTIONS : step + 1}
        max={TOTAL_QUESTIONS}
        label={progressLabel}
      />
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          if (isLast) void finish();
          else goTo(step + 1);
        }}
      >
        <h1
          id={HEADING_ID}
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold leading-snug tracking-tight outline-none"
        >
          {promptFor(step, quiz, followUp)}
        </h1>
        {followUp ? (
          <FollowUpScreen id={followUp} s={quiz} update={update} seed={seed} />
        ) : (
          <QuestionScreen
            step={step}
            s={quiz}
            update={update}
            seed={seed}
            onSkipQ4={() => {
              update((s) => ({ ...s, q4: { most: [], least: null } }));
              goTo(step + 1);
            }}
          />
        )}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          {step > 0 ? (
            <button type="button" className={secondaryButton} onClick={() => goTo(step - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className={primaryButton} disabled={!ok}>
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">{children}</main>
  );
}
