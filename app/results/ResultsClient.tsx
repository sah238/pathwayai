"use client";

/**
 * ZIP and income-bracket controls plus the three cards. Both answers live only
 * in this component's React state: never in the URL, storage, cookies or a
 * server request. They only choose among values the server precomputed.
 */
import { useId, useMemo, useState } from "react";
import { CareerCard } from "@/components/cards/CareerCard";
import { GuaranteeNote } from "@/components/cards/GuaranteeNote";
import { VintageBanner } from "@/components/cards/VintageBanner";
import { INCOME_TIERS, type IncomeTier } from "@/lib/calc/net-price";
import { sourcesOnScreen, zipStatus, type ZipStatus } from "./select";
import type { CardViewModel } from "./view-model";

const STATE_NAMES = { DC: "DC", MD: "Maryland", VA: "Virginia" } as const;
const TIERS = Object.entries(INCOME_TIERS).map(([k, v]) => ({ tier: Number(k) as IncomeTier, label: v.label }));

function zipMessage(status: ZipStatus): string {
  switch (status.kind) {
    case "none":
      return "No ZIP entered: showing national wages.";
    case "incomplete":
      return "Enter a 5-digit ZIP code. Showing national wages for now.";
    case "outside_region":
      return "This ZIP is outside DC, Maryland and Virginia, so national wages are shown.";
    case "state":
      return `Showing ${STATE_NAMES[status.state]} wages where they are published.`;
  }
}

export function ResultsClient({ cards }: { cards: CardViewModel[] }) {
  const [zip, setZip] = useState("");
  const [tier, setTier] = useState<IncomeTier | null>(null);
  const zipId = useId();
  const tierId = useId();
  // Keyed on the ZIP string: zipStatus returns a new object each render.
  const status = useMemo(() => zipStatus(zip), [zip]);
  const sources = useMemo(() => sourcesOnScreen(cards, status, tier), [cards, status, tier]);

  return (
    <div className="space-y-6">
      <section
        aria-label="Personalize these cards"
        className="grid gap-4 rounded-xl border border-zinc-200 p-4 sm:grid-cols-2 dark:border-zinc-800"
      >
        <div>
          <label htmlFor={zipId} className="block text-sm font-medium">
            ZIP code <span className="font-normal text-zinc-600 dark:text-zinc-400">(optional, DC, MD or VA)</span>
          </label>
          <input
            id={zipId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            aria-describedby={`${zipId}-msg`}
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
          />
          <p id={`${zipId}-msg`} aria-live="polite" className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {zipMessage(status)}
          </p>
        </div>
        <div>
          <label htmlFor={tierId} className="block text-sm font-medium">
            Family income <span className="font-normal text-zinc-600 dark:text-zinc-400">(optional, for net price)</span>
          </label>
          <select
            id={tierId}
            value={tier ?? ""}
            onChange={(e) => setTier(e.target.value === "" ? null : (Number(e.target.value) as IncomeTier))}
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
          >
            <option value="">Prefer not to say</option>
            {TIERS.map((t) => (
              <option key={t.tier} value={t.tier}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Used only to pick a price bracket. It stays on this page and is never saved or sent.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-y-0">
        {cards.map((card) => (
          <CareerCard key={card.soc} card={card} zip={status} tier={tier} />
        ))}
      </div>

      <GuaranteeNote />
      <VintageBanner sources={sources} />
    </div>
  );
}
