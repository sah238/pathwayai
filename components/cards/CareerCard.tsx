import type { ReactNode } from "react";
import { selectNetPrice, selectWages, sortPrograms, type ZipStatus } from "@/app/results/select";
import {
  NO_LOCAL_PROGRAM_BADGE,
  SMALL_SAMPLE_BADGE,
  type CardViewModel,
  type ProgramView,
  type WageView,
} from "@/app/results/view-model";
import type { IncomeTier, NetPriceResult } from "@/lib/calc/net-price";
import type { WagePercentiles } from "@/lib/data/lookup";
import { Badge } from "./Badge";
import { ExpandPanel } from "./ExpandPanel";
import { Factor } from "./Factor";
import { FIT_INTERESTS_INTRO, FIT_VALUES_INTRO, type CardExtras } from "./personalize";
import { STATE_NAMES, usd } from "./format";
import { SourceNote } from "./SourceNote";

const VISIBLE_PROGRAMS = 3;

const PAY_ROWS: { key: keyof WagePercentiles; label: string }[] = [
  { key: "p10", label: "10th percentile" },
  { key: "p25", label: "25th percentile" },
  { key: "median", label: "Median (middle)" },
  { key: "p90", label: "90th percentile" },
];

function Pay({ wages, zip }: { wages: WageView; zip: ZipStatus }) {
  const scope =
    wages.scope === "state" && wages.requested_state ? `${STATE_NAMES[wages.requested_state]} wages` : "National wages";
  return (
    <>
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{scope}, per year</span>
        <SourceNote source={wages.source} />
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        {PAY_ROWS.map(({ key, label }) => (
          <div key={key} className="contents">
            <dt className="text-body">
              {label}
              {wages.small_sample.includes(key) && (
                <>
                  {" "}
                  <Badge tone="warn">{SMALL_SAMPLE_BADGE}</Badge>
                </>
              )}
            </dt>
            <dd className={`text-right tabular-nums ${key === "median" ? "font-semibold" : ""}`}>
              {usd.format(wages.percentiles[key])}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        {wages.badge && <Badge tone="warn">{wages.badge}</Badge>}
        {wages.small_sample.length > 0 && <SourceNote source={wages.small_sample_source} />}
      </div>
      {zip.kind === "none" && (
        <p className="text-xs text-body">Enter a ZIP code above to see local wages.</p>
      )}
    </>
  );
}

function NetPrice({ result }: { result: NetPriceResult }) {
  let body: ReactNode;
  switch (result.status) {
    case "amount":
    case "overall_average":
      body = (
        <>
          <span className="font-semibold tabular-nums">{usd.format(result.amount)}</span>{" "}
          <span className="text-body">
            {result.status === "overall_average" ? `${result.period}, ${result.label}` : result.label}
          </span>
        </>
      );
      break;
    case "net_grant_surplus":
    case "not_applicable":
      body = <span className="font-medium">{result.label}</span>;
      break;
    case "missing":
      body = <Badge tone="warn">{result.badge}</Badge>;
      break;
  }
  return (
    <div className="space-y-1">
      <p>
        Net price: {body} <SourceNote source={result.source} />
      </p>
      {result.residency_note && (
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <Badge>In-state only</Badge>
          <span className="text-body">Public school price for {result.residency_note}.</span>
        </p>
      )}
    </div>
  );
}

function Program({ program, tier }: { program: ProgramView; tier: IncomeTier | null }) {
  return (
    <li className="rounded-lg border border-light-gray p-3">
      <p className="font-medium">{program.provider_name}</p>
      <p className="text-xs text-body">
        {program.city}, {program.state}
        {program.registered_in.length > 0 && ` · registered in ${program.registered_in.join(", ")}`}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2">
        <span>
          {program.is_apprenticeship ? "Paid registered apprenticeship" : `${program.program_title} (${program.credential})`}
          {program.program_length_years && ` · ${program.program_length_years.value} years`}
        </span>
        <SourceNote source={program.program_length_years?.source ?? program.program_source} />
      </p>
      <div className="mt-1">
        <NetPrice result={selectNetPrice(program, tier)} />
      </div>
    </li>
  );
}

function Path({ card, zip, tier }: { card: CardViewModel; zip: ZipStatus; tier: IncomeTier | null }) {
  const { path } = card;
  const programs = sortPrograms(path.programs, zip);
  const shown = programs.slice(0, VISIBLE_PROGRAMS);
  const more = programs.slice(VISIBLE_PROGRAMS);
  return (
    <>
      <p className="flex flex-wrap items-center gap-2">
        <span>
          <span className="text-body">Typical entry education:</span>{" "}
          {path.entry_education.value}
        </span>
        <SourceNote source={path.entry_education.source} />
      </p>
      <p className="flex flex-wrap items-center gap-2">
        <span>{path.job_zone_label.value}</span>
        <SourceNote source={path.job_zone_label.source} />
      </p>
      {path.apprenticeship_option && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge>Apprenticeship option</Badge>
          <span className="text-body">Earn while you train.</span>
          <SourceNote source={path.training_pathway.source} />
        </p>
      )}

      {programs.length === 0 ? (
        <div className="space-y-1">
          <Badge tone="warn">{NO_LOCAL_PROGRAM_BADGE}</Badge>
          <p>
            We didn&rsquo;t find a school or apprenticeship in DC, Maryland or Virginia with recent graduates for this
            career.
          </p>
          {path.national_route.value.length > 0 && (
            <p>
              <span className="text-body">Programs that lead here nationally:</span>{" "}
              {path.national_route.value.join("; ")} <SourceNote source={path.national_route.source} />
            </p>
          )}
        </div>
      ) : (
        <>
          <h4 className="pt-1 font-medium">Local programs</h4>
          <ul className="space-y-2">
            {shown.map((p) => (
              <Program key={`${p.record_id}|${p.program_title}`} program={p} tier={tier} />
            ))}
          </ul>
          {more.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium underline underline-offset-2">
                Show {more.length} more
              </summary>
              <ul className="mt-2 space-y-2">
                {more.map((p) => (
                  <Program key={`${p.record_id}|${p.program_title}`} program={p} tier={tier} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}

interface CareerCardProps {
  card: CardViewModel;
  zip: ZipStatus;
  tier: IncomeTier | null;
  /** Expand layer open for this card (one card at a time). */
  open: boolean;
  onToggle: () => void;
  /** From the quiz (in memory only): selection label, "Why it fits you", summary. Absent after a refresh. */
  extras?: CardExtras;
}

/** Glance layer (factors 1–4) plus the Expand toggle. Cards share rows (subgrid) so factors line up. */
export function CareerCard({ card, zip, tier, open, onToggle, extras }: CareerCardProps) {
  const wages = selectWages(card, zip);
  const panelId = `expand-${card.soc}`;
  return (
    // Outer subgrid: 6 shared rows. The glance part fills rows 1–5 so factors line up across cards;
    // the Expand footer sits in row 6 with self-start, so an open panel never stretches the other cards.
    <article aria-labelledby={`card-${card.soc}`} className="row-span-6 grid grid-rows-subgrid gap-0">
      <div className="row-span-5 grid min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-subgrid gap-0 overflow-hidden rounded-t-[20px] border border-b-0 border-light-gray bg-white">
      <header className="min-w-0 bg-tint p-5 md:p-4 lg:p-5">
        {extras && (
          <p className="mb-1 text-xs font-semibold tracking-[1px] text-bright-blue uppercase">
            {extras.label.kicker}
          </p>
        )}
        <h2 id={`card-${card.soc}`} className="font-display text-[22px] leading-[1.15] font-bold wrap-break-word text-georgetown-blue md:text-lg lg:text-[22px]">
          {card.title.value}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-xs text-body">
          SOC {card.soc} <SourceNote source={card.title.source} />
        </p>
        {extras?.label.heading && (
          <div className="mt-2 rounded-lg bg-highlight p-2 text-sm text-georgetown-blue">
            <p className="font-medium">{extras.label.heading}</p>
            {extras.label.note && <p className="text-xs">{extras.label.note}</p>}
          </div>
        )}
      </header>

      <Factor n={1} title="A day in this job">
        {extras?.summary ? (
          <>
            <p>{extras.summary.summary}</p>
            <p className="text-xs text-body">
              Written by AI from O*NET&rsquo;s task list for this career.
            </p>
            <SourceNote source={extras.summary.source} />
          </>
        ) : (
          <>
            <ul className="list-disc space-y-1 pl-5">
              {card.tasks.value.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <SourceNote source={card.tasks.source} />
          </>
        )}
      </Factor>

      {extras?.fit ? (
        <Factor n={2} title="Why it fits you">
          {extras.fit.values.length > 0 && (
            <>
              <p>{FIT_VALUES_INTRO}</p>
              <ul className="list-disc space-y-1 pl-5">
                {extras.fit.values.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </>
          )}
          {extras.fit.interests.length > 0 && (
            <>
              <p>{FIT_INTERESTS_INTRO}</p>
              <ul className="list-disc space-y-1 pl-5">
                {extras.fit.interests.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </>
          )}
          <SourceNote source={card.rewards.source} />
        </Factor>
      ) : (
      <Factor n={2} title="What this job rewards">
        {card.rewards.status === "rated" ? (
          <>
            <ul className="list-disc space-y-1 pl-5">
              {card.rewards.labels.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <SourceNote source={card.rewards.source} />
          </>
        ) : (
          <>
            <Badge tone="warn">{card.rewards.badge}</Badge>
            <p className="text-body">
              O*NET hasn&rsquo;t rated the work values for this career yet, so we can&rsquo;t show them.
            </p>
          </>
        )}
      </Factor>
      )}

      <Factor n={3} title="Pay">
        <Pay wages={wages} zip={zip} />
      </Factor>

      <Factor n={4} title="Path to get there">
        <Path card={card} zip={zip} tier={tier} />
      </Factor>
      </div>

      <div className="self-start overflow-hidden rounded-b-[20px] border border-light-gray bg-white">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          // Only reference the panel while it is rendered.
          aria-controls={open ? panelId : undefined}
          className="flex w-full items-center justify-between gap-2 p-4 text-left text-sm font-semibold text-georgetown-blue hover:bg-tint focus-visible:outline-offset-[-3px]"
        >
          <span>
            {open ? "Show less" : "What would it be like?"}
            <span className="sr-only"> — {card.title.value}</span>
          </span>
          <span aria-hidden="true">{open ? "▲" : "▼"}</span>
        </button>
        {open && <ExpandPanel card={card} zip={zip} id={panelId} />}
      </div>
    </article>
  );
}
