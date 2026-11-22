import type { Source } from "@/lib/data/provenance";
import { Badge } from "./Badge";

/** A small "Source" link beside a value (CLAUDE.md rule 7). */
export function SourceNote({ source }: { source: Source | null }) {
  if (!source) return <Badge tone="warn">Source not listed</Badge>;
  const label = source.data_vintage ? `${source.source}, ${source.data_vintage}` : source.source;
  const cls = "text-xs text-zinc-600 underline decoration-dotted underline-offset-2 dark:text-zinc-400";
  return source.source_url ? (
    <a href={source.source_url} className={cls} title={label} target="_blank" rel="noopener noreferrer">
      Source<span className="sr-only">: {label} (opens in a new tab)</span>
    </a>
  ) : (
    <span className={cls} title={label}>
      Source<span className="sr-only">: {label}</span>
    </span>
  );
}
