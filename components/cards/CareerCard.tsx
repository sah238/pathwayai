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
import { SourceNote } from "./SourceNote";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const STATE_NAMES = { DC: "DC", MD: "Maryland", VA: "Virginia" } as const;
const VISIBLE_PROGRAMS = 3;

/** One row of the glance layer. Cards share rows (subgrid) so factors line up side by side. */
function Factor({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-zinc-200 p-4 dark:border-zinc-800 print:break-inside-avoid">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <span aria-hidden="true">{n} · </span>
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </section>
  );
}

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
            <dt className="text-zinc-600 dark:text-zinc-400">
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
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Enter a ZIP code above to see local wages.</p>
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
          <span className="text-zinc-600 dark:text-zinc-400">
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
          <span className="text-zinc-600 dark:text-zinc-400">Public school price for {result.residency_note}.</span>
        </p>
      )}
    </div>
  );
}

function Program({ program, tier }: { program: ProgramView; tier: IncomeTier | null }) {
  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="font-medium">{program.provider_name}</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
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
          <span className="text-zinc-600 dark:text-zinc-400">Typical entry education:</span>{" "}
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
          <span className="text-zinc-600 dark:text-zinc-400">Earn while you train.</span>
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
              <span className="text-zinc-600 dark:text-zinc-400">Programs that lead here nationally:</span>{" "}
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

export function CareerCard({ card, zip, tier }: { card: CardViewModel; zip: ZipStatus; tier: IncomeTier | null }) {
  const wages = selectWages(card, zip);
  return (
    <article
      aria-labelledby={`card-${card.soc}`}
      className="row-span-5 grid grid-rows-subgrid gap-0 overflow-hidden rounded-xl border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
    >
      <header className="p-4">
        <h2 id={`card-${card.soc}`} className="text-xl font-semibold">
          {card.title.value}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          SOC {card.soc} <SourceNote source={card.title.source} />
        </p>
      </header>

      <Factor n={1} title="A day in this job">
        <ul className="list-disc space-y-1 pl-5">
          {card.tasks.value.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <SourceNote source={card.tasks.source} />
      </Factor>

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
            <p className="text-zinc-600 dark:text-zinc-400">
              O*NET hasn&rsquo;t rated the work values for this career yet, so we can&rsquo;t show them.
            </p>
          </>
        )}
      </Factor>

      <Factor n={3} title="Pay">
        <Pay wages={wages} zip={zip} />
      </Factor>

      <Factor n={4} title="Path to get there">
        <Path card={card} zip={zip} tier={tier} />
      </Factor>
    </article>
  );
}
