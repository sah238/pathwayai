import type { ReactNode } from "react";

/** One numbered factor on a career card. */
export function Factor({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <span aria-hidden="true">{n} · </span>
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </section>
  );
}
