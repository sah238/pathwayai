import type { Metadata } from "next";
import { BrowseClient } from "@/components/browse/BrowseClient";
import { buildBrowseData } from "@/components/browse/data";
import { getRepository } from "@/lib/data/server";

export const metadata: Metadata = {
  title: "Browse careers · PathwayAI",
};

/** Fallback when the Claude API is unavailable: filters run in the browser, with no API calls. */
export default function BrowsePage() {
  const data = buildBrowseData(getRepository());
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold sm:text-3xl">Browse careers</h1>
      <p className="mt-2 mb-6 max-w-2xl text-zinc-700 dark:text-zinc-300">
        Filter the list, pick three careers that catch your eye, and compare them side by side.
      </p>
      <BrowseClient {...data} />
    </main>
  );
}
