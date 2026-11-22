import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

const PILLS = ["No sign-up", "Answers aren't saved", "DC · Maryland · Virginia"];

const STEPS = [
  {
    title: "Answer 11 questions",
    body: "What you like doing, what you want from a job, and how much school sounds right.",
  },
  {
    title: "Meet three careers",
    body: "A direct match, an apprenticeship or two-year option, and a wild card you might love.",
  },
  {
    title: "Take it to your people",
    body: "Print a one-page guide to talk it through with a counselor or your family.",
  },
];

const exampleLabel = "text-[13px] font-semibold tracking-[1px] uppercase";
const smallExample = "flex flex-col justify-between gap-8 rounded-[22px] p-[22px]";
const smallExampleTitle = "font-display text-[22px] leading-[1.15] font-bold";

export default function Home() {
  return (
    <main className="flex-1">
      <section>
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-12 px-6 pt-12 pb-[72px]">
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
            <h1 className="font-display text-[clamp(2.5rem,9vw,4.25rem)] leading-[1.02] font-bold tracking-[-1.5px] text-georgetown-blue">
              What could you{" "}
              <span className="rounded-[10px] bg-highlight px-2.5 text-bright-blue">actually</span> do
              after high school?
            </h1>
            <p className="text-lg leading-[1.55] text-body sm:text-xl">
              Take an 11-question quiz about what you like and what you care about. Get three real
              careers, what they pay near you, and how to get started.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link href="/quiz" className={buttonStyles.primary}>
                Start the quiz
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9h12M10 4l5 5-5 5" />
                </svg>
              </Link>
              <Link
                href="/browse"
                className="px-2 py-4 text-[17px] font-semibold text-georgetown-blue underline hover:text-bright-blue"
              >
                Just browse careers
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2.5 text-sm font-medium">
              {PILLS.map((pill) => (
                <li key={pill} className="rounded-full bg-tint px-3 py-2 text-georgetown-blue">
                  {pill}
                </li>
              ))}
            </ul>
          </div>

          <div
            aria-hidden="true"
            className="grid min-w-0 flex-[1_1_424px] grid-cols-1 gap-4 min-[480px]:grid-cols-2"
          >
            <p className="text-sm font-semibold text-georgetown-gray min-[480px]:col-span-2">
              Example results
            </p>
            <div className="flex flex-col min-[480px]:col-span-2 justify-between gap-10 rounded-[22px] bg-bright-blue p-6 text-white">
              <span className={`${exampleLabel} text-on-bright-blue`}>Your top match</span>
              <span className="font-display text-[32px] leading-[1.1] font-bold">Electrician</span>
            </div>
            <div className={`${smallExample} bg-ivory text-georgetown-blue`}>
              <span className={exampleLabel}>Two-year path</span>
              <span className={smallExampleTitle}>Dental Hygienist</span>
            </div>
            <div className={`${smallExample} bg-georgetown-blue text-white`}>
              <span className={`${exampleLabel} text-light-gray`}>Wild card</span>
              <span className={smallExampleTitle}>Environmental Science Tech</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-it-works-title" className="bg-georgetown-blue text-white">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-9 px-6 py-[72px]">
          <h2
            id="how-it-works-title"
            className="font-display text-[clamp(2rem,6vw,2.5rem)] leading-tight font-bold tracking-[-0.5px]"
          >
            Three steps. No pressure.
          </h2>
          <ol className="flex flex-wrap gap-5">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5 rounded-[20px] bg-ivory p-7 text-georgetown-blue"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-xl bg-bright-blue font-display text-xl font-bold text-white"
                >
                  {i + 1}
                </span>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="leading-[1.6] text-step-body">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="About the data">
        <div className="mx-auto max-w-[1160px] px-6 py-14">
          <p className="leading-[1.6] text-body">
            <strong className="text-georgetown-blue">Real data, honest limits.</strong> Pay, job outlook
            and costs come from the U.S. Bureau of Labor Statistics, O*NET and the College Scorecard.
            They&apos;re past averages, not guarantees.
          </p>
        </div>
      </section>
    </main>
  );
}
