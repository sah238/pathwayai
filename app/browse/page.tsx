import type { Metadata } from "next";
import { BrowseClient } from "@/components/browse/BrowseClient";
import { buildBrowseData } from "@/components/browse/data";
import { pageIntro, pageShell, pageTitle } from "@/components/ui/surface";
import { getRepository } from "@/lib/data/server";

export const metadata: Metadata = {
  title: "Browse careers · PathwayAI",
};

/** Fallback when the Claude API is unavailable: filters run in the browser, with no API calls. */
export default function BrowsePage() {
  const data = buildBrowseData(getRepository());
  return (
    <main className={pageShell}>
      <h1 className={pageTitle}>Browse careers</h1>
      <p className={`${pageIntro} mt-3 mb-6 max-w-2xl`}>
        Filter the list, pick three careers that catch your eye, and compare them side by side.
      </p>
      <BrowseClient {...data} />
    </main>
  );
}
