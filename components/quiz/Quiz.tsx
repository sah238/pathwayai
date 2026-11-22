"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "./controls";
import { buildQuizResponses, canAdvance, followUpsFor, initialState, makeOrder, type QuizState } from "./logic";
import { TOTAL_QUESTIONS } from "./questions";
import { FollowUpScreen, HEADING_ID, promptFor, QuestionScreen } from "./screens";

const LAST_QUESTION = TOTAL_QUESTIONS - 1;

const primaryButton =
  "min-h-12 rounded-full bg-blue-700 px-6 text-base font-semibold text-white hover:bg-blue-800 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 " +
  "disabled:cursor-not-allowed disabled:bg-zinc-400 dark:disabled:bg-zinc-600";
const secondaryButton =
  "min-h-12 rounded-full border border-zinc-400 px-6 text-base font-semibold hover:bg-zinc-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:hover:bg-zinc-800";

/**
 * The values quiz. Answers live only in this component's state: nothing is
 * written to storage, cookies or the server.
 */
export function Quiz() {
  // null until "Start": the shuffled order is made in a click handler, so the
  // server-rendered HTML and the first client render always match.
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [rawStep, setStep] = useState(0);
  const [seed, setSeed] = useState(0);
  const [finished, setFinished] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const started = quiz !== null;

  useEffect(() => {
    // Move focus to the new question so screen readers announce it.
    if (moved.current) headingRef.current?.focus();
  }, [rawStep, finished, started]);

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

  const finish = () => {
    const responses = buildQuizResponses(quiz);
    // TODO(session 9): hand `responses` to /api/extract here, in memory only.
    void responses;
    moved.current = true;
    setFinished(true);
  };

  if (finished) {
    return (
      <Shell>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none">
          Thanks, that&apos;s everything!
        </h1>
        <p className="text-lg text-zinc-700 dark:text-zinc-300">Your career matches will show up here soon.</p>
        <div className="flex gap-3">
          <button type="button" className={secondaryButton} onClick={() => { moved.current = true; setFinished(false); }}>
            Back to my answers
          </button>
          <button type="button" className={secondaryButton} onClick={start}>
            Start over
          </button>
        </div>
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
          if (isLast) finish();
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
