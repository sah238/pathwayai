import type { ReactNode } from "react";

/** One numbered factor on a career card. */
export function Factor({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-light-gray p-4">
      <h3 className="text-xs font-semibold tracking-[1px] text-bright-blue uppercase">
        <span aria-hidden="true">{n} · </span>
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm leading-[1.5] text-body">{children}</div>
    </section>
  );
}
