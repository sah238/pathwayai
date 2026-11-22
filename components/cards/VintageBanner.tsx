import type { Source } from "@/lib/data/provenance";

/** Data vintage and attribution banner, built from the sources of the values on screen. */
export function VintageBanner({ sources }: { sources: Source[] }) {
  return (
    <section
      aria-labelledby="vintage-heading"
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 id="vintage-heading" className="font-semibold">
        Where these numbers come from
      </h2>
      <ul className="mt-2 space-y-1 text-zinc-700 dark:text-zinc-300">
        {sources.map((s) => (
          <li key={`${s.source}|${s.data_vintage}|${s.source_url}`} className="break-words">
            {s.source_url ? (
              <a href={s.source_url} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                {s.source}
              </a>
            ) : (
              s.source
            )}
            {" · "}
            {s.data_vintage ?? <span className="italic">date not listed</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
        O*NET content is used under the CC BY 4.0 license (USDOL/ETA).
      </p>
    </section>
  );
}
