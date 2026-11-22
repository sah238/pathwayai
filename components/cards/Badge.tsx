import type { ReactNode } from "react";

type Tone = "info" | "warn";

const TONES: Record<Tone, string> = {
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100",
  warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
};

/** Missing-data and context badge. Text is always visible (not color alone). */
export function Badge({ children, tone = "info" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-5 print:border-black print:bg-white print:text-black ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
