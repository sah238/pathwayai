import type { Metadata } from "next";
import { Suspense } from "react";
import { getRepository } from "@/lib/data/server";
import { parseSocs } from "./parse";
import { ResultsClient } from "./ResultsClient";
import { buildCardViewModel, type CardViewModel } from "./view-model";

export const metadata: Metadata = {
  title: "Your career cards · PathwayAI",
};

export default function ResultsPage(props: PageProps<"/results">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10 print:max-w-none print:p-0">
      <h1 className="text-2xl font-semibold sm:text-3xl print:hidden">Three careers to explore</h1>
      <p className="mt-2 max-w-2xl text-zinc-700 print:hidden dark:text-zinc-300">
        Compare them side by side. Every number comes from public federal data; tap &ldquo;Source&rdquo; to see where.
      </p>
      <div className="mt-6 print:mt-0">
        <Suspense fallback={<p>Loading your cards…</p>}>
          <Results searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/results">, "searchParams">) {
  // Only `socs` is read. ZIP and income tier are entered on the page, never taken from the URL.
  const { socs } = await searchParams;
  const parsed = parseSocs(socs);
  if (!parsed.ok) return <Problem message={parsed.message} />;

  const repo = getRepository();
  const cards = parsed.socs.map((soc) => buildCardViewModel(repo, soc));
  const unknown = parsed.socs.filter((_, i) => cards[i] === null);
  if (unknown.length) return <Problem message={`We don't have data for: ${unknown.join(", ")}.`} />;

  return <ResultsClient cards={cards as CardViewModel[]} />;
}

function Problem({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-medium">We couldn&rsquo;t show these careers.</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}
