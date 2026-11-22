"use client";

/**
 * ZIP and income-bracket controls plus the three cards. Both answers live only
 * in this component's React state: never in the URL, storage, cookies or a
 * server request. They only choose among values the server precomputed.
 *
 * When the student arrives from the quiz, the in-memory handoff
 * (components/quiz/recommend-store.ts) pre-fills the ZIP and adds the
 * selection labels, "Why it fits you" and summaries. After a refresh it is
 * gone and the page shows the dataset view alone.
 */
import { useId, useMemo, useState } from "react";
import { CareerCard } from "@/components/cards/CareerCard";
import { CounselorGuide } from "@/components/cards/CounselorGuide";
import { cardExtras } from "@/components/cards/personalize";
import { STATE_NAMES } from "@/components/cards/format";
import { GuaranteeNote } from "@/components/cards/GuaranteeNote";
import { VintageBanner } from "@/components/cards/VintageBanner";
import { getHandoff } from "@/components/quiz/recommend-store";
import { buttonStyles } from "@/components/ui/button";
import { fieldStyles, panel } from "@/components/ui/surface";
import { INCOME_TIERS, type IncomeTier } from "@/lib/calc/net-price";
import { OUTSIDE_REGION_ZIP_MESSAGE } from "@/lib/shared-text";
import { sourcesOnScreen, zipStatus, type ZipStatus } from "./select";
import type { CardViewModel } from "./view-model";
const TIERS = Object.entries(INCOME_TIERS).map(([k, v]) => ({ tier: Number(k) as IncomeTier, label: v.label }));

function zipMessage(status: ZipStatus): string {
  switch (status.kind) {
    case "none":
      return "No ZIP entered: showing national wages.";
    case "incomplete":
      return "Enter a 5-digit ZIP code. Showing national wages for now.";
    case "outside_region":
      return OUTSIDE_REGION_ZIP_MESSAGE;
    case "state":
      return `Showing ${STATE_NAMES[status.state]} wages where they are published.`;
  }
}

export function ResultsClient({ cards }: { cards: CardViewModel[] }) {
  // Read once: the handoff only exists after an in-app navigation from the quiz,
  // so server render and a fresh page load both see null and match.
  const [handoff] = useState(() => getHandoff(cards.map((c) => c.soc)));
  const extras = useMemo(() => new Map(handoff?.cards.map((c) => [c.soc, cardExtras(c)]) ?? []), [handoff]);
  const [zip, setZip] = useState(handoff?.zip ?? "");
  const [tier, setTier] = useState<IncomeTier | null>(null);
  const zipId = useId();
  const tierId = useId();
  // Keyed on the ZIP string: zipStatus returns a new object each render.
  const status = useMemo(() => zipStatus(zip), [zip]);
  // Expand layer: one card open at a time.
  const [openSoc, setOpenSoc] = useState<string | null>(null);
  const sources = useMemo(() => sourcesOnScreen(cards, status, tier, openSoc), [cards, status, tier, openSoc]);

  return (
    <>
    <div className="space-y-6 print:hidden">
      <section
        aria-label="Personalize these cards"
        className={`${panel} grid gap-4 sm:grid-cols-2`}
      >
        <div>
          <label htmlFor={zipId} className="block text-sm font-medium">
            ZIP code <span className="font-normal text-body">(optional, DC, MD or VA)</span>
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
            className={`${fieldStyles} mt-1`}
          />
          <p id={`${zipId}-msg`} aria-live="polite" className="mt-1 text-xs text-body">
            {zipMessage(status)}
          </p>
        </div>
        <div>
          <label htmlFor={tierId} className="block text-sm font-medium">
            Family income <span className="font-normal text-body">(optional, for net price)</span>
          </label>
          <select
            id={tierId}
            value={tier ?? ""}
            onChange={(e) => setTier(e.target.value === "" ? null : (Number(e.target.value) as IncomeTier))}
            className={`${fieldStyles} mt-1`}
          >
            <option value="">Prefer not to say</option>
            {TIERS.map((t) => (
              <option key={t.tier} value={t.tier}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-body">
            Used only to pick a price bracket. It stays on this page and is never saved or sent.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-y-0">
        {cards.map((card) => (
          <CareerCard
            key={card.soc}
            card={card}
            zip={status}
            tier={tier}
            open={openSoc === card.soc}
            onToggle={() => setOpenSoc((cur) => (cur === card.soc ? null : card.soc))}
            extras={extras.get(card.soc)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-[20px] bg-highlight p-5">
        <button
          type="button"
          onClick={() => window.print()}
          className={buttonStyles.compact}
        >
          Print counselor guide
        </button>
        <p className="min-w-0 flex-[1_1_16rem] text-sm text-body">
          A one-page guide with your shortlist, questions to ask, and cost details. Printing happens on your device.
        </p>
      </div>

      <GuaranteeNote />
      <VintageBanner sources={sources} />
    </div>
    <CounselorGuide cards={cards} zip={status} tier={tier} />
    </>
  );
}
