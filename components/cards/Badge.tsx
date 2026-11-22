import type { ReactNode } from "react";

type Tone = "info" | "warn";

const TONES: Record<Tone, string> = {
  info: "border-bright-blue bg-highlight text-georgetown-blue",
  warn: "border-warn-line bg-warn-tint text-warn",
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
