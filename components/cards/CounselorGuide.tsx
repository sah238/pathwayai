import { selectNetPrice, selectWages, sortPrograms, type ZipStatus } from "@/app/results/select";
import type { CardViewModel } from "@/app/results/view-model";
import {
  COUNSELOR_QUESTIONS,
  FAMILY_QUESTIONS,
  GUIDE_REVIEW_STATUS,
  PIVOT_NOTE,
  STRENGTHS_PROMPTS,
} from "@/app/results/guide-prompts";
import { INCOME_TIERS, type IncomeTier, type NetPriceResult } from "@/lib/calc/net-price";
import type { Source } from "@/lib/data/provenance";
import { STATE_NAMES, usd } from "./format";

const PROGRAMS_PER_CAREER = 2;

/** One page, US Letter. Dark mode is overridden so the printout is black on white. */
const PRINT_CSS = `
@page { size: letter; margin: 0.4in; }
@media print {
  html, body { background: #fff !important; color: #000 !important; }
}
`;

/** Short form for print; the bracket and "average for aided students" are stated once below the list. */
function netPriceText(r: NetPriceResult): string {
  switch (r.status) {
    case "amount":
    case "overall_average":
      return `${usd.format(r.amount)} ${r.period}${r.residency_note ? " (in-state)" : ""}`;
    case "net_grant_surplus":
    case "not_applicable":
      return r.label;
    case "missing":
      return r.badge;
  }
}

/** Sources of the values printed on the guide (pay, education, first step, net prices). */
function guideSources(cards: CardViewModel[], zip: ZipStatus, tier: IncomeTier | null): Source[] {
  const out = new Map<string, Source>();
  const add = (s: Source | null | undefined) => {
    if (s) out.set(`${s.source}|${s.data_vintage}`, s);
  };
  for (const c of cards) {
    add(selectWages(c, zip).source);
    add(c.path.entry_education.source);
    add(c.expand.could_i.first_step.pathway.source);
    for (const p of c.path.programs) add(selectNetPrice(p, tier).source);
  }
  return [...out.values()];
}

function Heading({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="mt-2 border-b border-georgetown-blue pb-0.5 font-display text-[11pt] font-bold text-georgetown-blue">
      {n}. {children}
    </h2>
  );
}

/**
 * Guide layer (printable counselor discussion guide). Hidden on screen and
 * shown only when printing. Uses the ZIP and bracket already on screen; nothing
 * is sent anywhere.
 */
export function CounselorGuide({ cards, zip, tier }: { cards: CardViewModel[]; zip: ZipStatus; tier: IncomeTier | null }) {
  const sources = guideSources(cards, zip, tier);
  return (
    <div className="hidden bg-white text-[9.5pt] leading-[1.3] text-black print:block" data-guide>
      <style>{PRINT_CSS}</style>
      <header>
        <h1 className="font-display text-[15pt] font-bold text-georgetown-blue">My career exploration guide</h1>
        <p>From PathwayAI. Bring this page to a counselor or talk it over with your family.</p>
      </header>

      <Heading n={1}>My strengths and growth</Heading>
      <ul className="mt-1 space-y-1.5">
        {STRENGTHS_PROMPTS.map((p) => (
          <li key={p}>
            {p}
            <div className="mt-3 border-b border-georgetown-gray" />
          </li>
        ))}
      </ul>
      <p className="mt-1.5 italic">{PIVOT_NOTE}</p>

      <Heading n={2}>My shortlist and what&rsquo;s next</Heading>
      <table className="mt-1 w-full border-collapse text-left align-top">
        <thead>
          <tr className="border-b border-georgetown-gray">
            <th className="w-[22%] py-0.5 pr-2">Career</th>
            <th className="w-[16%] py-0.5 pr-2">Median pay / year</th>
            <th className="w-[20%] py-0.5 pr-2">Typical entry education</th>
            <th className="py-0.5">First step from high school</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => {
            const w = selectWages(c, zip);
            const scope = w.scope === "state" && w.requested_state ? STATE_NAMES[w.requested_state] : "U.S.";
            return (
              <tr key={c.soc} className="border-b border-light-gray align-top">
                <td className="py-0.5 pr-2 font-semibold">{c.title.value}</td>
                <td className="py-0.5 pr-2">
                  {usd.format(w.percentiles.median)} ({scope})
                </td>
                <td className="py-0.5 pr-2">{c.path.entry_education.value}</td>
                <td className="py-0.5">{c.expand.could_i.first_step.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Heading n={3}>Talk it through</Heading>
      <div className="mt-1 grid grid-cols-2 gap-4">
        <div>
          <p className="font-semibold">With a counselor</p>
          <ul className="list-[square] pl-4">
            {COUNSELOR_QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">With my family</p>
          <ul className="list-[square] pl-4">
            {FAMILY_QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      </div>

      <Heading n={4}>Cost and aid details</Heading>
      <ul className="mt-1 space-y-1">
        {cards.map((c) => {
          // Net price is per school, so list each school once.
          const programs = sortPrograms(c.path.programs, zip)
            .filter((p, i, all) => all.findIndex((q) => q.record_id === p.record_id) === i)
            .slice(0, PROGRAMS_PER_CAREER);
          return (
            <li key={c.soc}>
              <span className="font-semibold">{c.title.value}:</span>{" "}
              {programs.length === 0
                ? "No local program found in DC, Maryland or Virginia."
                : programs
                    .map((p) => `${p.provider_name} (${p.city}, ${p.state}): ${netPriceText(selectNetPrice(p, tier))}`)
                    .join("; ")}
            </li>
          );
        })}
      </ul>
      <p className="mt-1">
        Net prices shown are for{" "}
        {tier === null ? "all aided students, any income" : `family income ${INCOME_TIERS[tier].label}`}: averages for
        students who got aid, not a personal quote. Each school&rsquo;s website has a net price calculator for your own
        estimate. Learn about federal aid at studentaid.gov.
      </p>

      <footer className="mt-2 border-t border-georgetown-gray pt-1 text-[7.5pt] leading-tight text-body">
        <p>
          Pay is a historical average, not a guarantee. Sources:{" "}
          {sources.map((s) => (s.data_vintage ? `${s.source} (${s.data_vintage})` : s.source)).join("; ")}. O*NET
          content used under CC BY 4.0.
        </p>
        <p className="mt-0.5">Prompts and first-step wording: {GUIDE_REVIEW_STATUS.toLowerCase()}.</p>
      </footer>
    </div>
  );
}
