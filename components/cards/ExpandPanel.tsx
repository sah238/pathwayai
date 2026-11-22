import { servesState, type ZipStatus } from "@/app/results/select";
import type { CardViewModel } from "@/app/results/view-model";
import { NEVER_TOO_LATE } from "@/app/results/first-steps";
import { Badge } from "./Badge";
import { Factor } from "./Factor";
import { STATE_NAMES, signedPct, thousands } from "./format";
import { SourceNote } from "./SourceNote";

const WORK_ENV_TEXT: Record<string, string> = {
  Indoors: "Mostly indoors",
  Outdoors: "Often outdoors",
  "Physical/Active": "Physically active",
  "Desk/Seated": "Mostly at a desk",
  "High Public Contact": "Lots of contact with the public",
};

function CouldI({ card }: { card: CardViewModel }) {
  const { job_zone_label, first_step } = card.expand.could_i;
  return (
    <Factor n={5} title="Could I do this?">
      <p className="flex flex-wrap items-center gap-2">
        <span>{job_zone_label.value}</span>
        <SourceNote source={job_zone_label.source} />
      </p>
      <p>
        <span className="font-medium">First step from high school:</span> {first_step.text}{" "}
        <SourceNote source={first_step.pathway.source} />
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Wording: {first_step.review_status.toLowerCase()}.</p>
      <p className="rounded-lg bg-emerald-50 p-2 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        {NEVER_TOO_LATE}
      </p>
    </Factor>
  );
}

function WorkEnvironment({ card }: { card: CardViewModel }) {
  const env = card.expand.work_environment;
  return (
    <Factor n={8} title="Work environment">
      {env.status === "loaded" ? (
        <>
          <ul className="flex flex-wrap gap-2">
            {env.labels.map((l) => (
              <li key={l} className="rounded-full border border-zinc-300 px-2 py-0.5 dark:border-zinc-700">
                {WORK_ENV_TEXT[l] ?? l}
              </li>
            ))}
          </ul>
          <SourceNote source={env.source} />
        </>
      ) : (
        <>
          <Badge tone="warn">{env.badge}</Badge>
          <p className="text-zinc-600 dark:text-zinc-400">
            Work environment details for this career aren&rsquo;t in our data yet.
          </p>
        </>
      )}
    </Factor>
  );
}

function Outlook({ card }: { card: CardViewModel }) {
  const o = card.expand.outlook;
  const more = o.job_change_k >= 0;
  return (
    <Factor n={9} title="Outlook and AI">
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <dt className="text-zinc-600 dark:text-zinc-400">Jobs, 2025 to 2035 (U.S.)</dt>
        <dd className="text-right font-semibold tabular-nums">{signedPct(o.job_growth_pct)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">{more ? "New jobs" : "Fewer jobs"}</dt>
        <dd className="text-right tabular-nums">{thousands(o.job_change_k)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Openings per year</dt>
        <dd className="text-right tabular-nums">{thousands(o.annual_openings_k)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">BLS AI exposure</dt>
        <dd className="text-right font-semibold">{o.ai_exposure_tier.value}</dd>
      </dl>
      <p className="flex flex-wrap gap-2">
        <SourceNote source={o.source} />
        <SourceNote source={o.ai_exposure_tier.source} />
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        AI exposure tiers rank jobs against each other. They are not forecasts, and they don&rsquo;t say whether AI
        will replace tasks or help people do them.
      </p>
      {o.early_career && (
        <div className="space-y-1 rounded-lg border border-amber-300 p-2 dark:border-amber-700">
          <Badge tone="warn">{o.early_career.badge}</Badge>
          <p>{o.early_career.text}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{o.early_career.reason}</p>
          <SourceNote source={o.early_career.source} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Wording: {o.early_career.wording_status.toLowerCase()}.
          </p>
        </div>
      )}
    </Factor>
  );
}

function Location({ card, zip }: { card: CardViewModel; zip: ZipStatus }) {
  let body;
  if (zip.kind === "none" || zip.kind === "incomplete") {
    body = <p className="text-zinc-600 dark:text-zinc-400">Enter a ZIP code above to see details for your state.</p>;
  } else if (zip.kind === "outside_region") {
    body = (
      <>
        <Badge tone="warn">{card.wages.outside_region.badge}</Badge>
        <p>Your ZIP is outside DC, Maryland and Virginia, so this page shows national figures.</p>
      </>
    );
  } else {
    const name = STATE_NAMES[zip.state];
    const w = card.wages[zip.state];
    const serving = card.path.programs.some((p) => servesState(p, zip.state));
    body = (
      <>
        <p>
          Matched from your ZIP: <span className="font-medium">{name}</span>
        </p>
        {w.scope === "state" ? (
          w.employment !== null ? (
            <p className="flex flex-wrap items-center gap-2">
              <span>
                People working in this job in {name}:{" "}
                <span className="font-semibold tabular-nums">{w.employment.toLocaleString("en-US")}</span>
              </span>
              <SourceNote source={w.source} />
            </p>
          ) : (
            <Badge tone="warn">{w.badge}</Badge>
          )
        ) : (
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="warn">{w.badge}</Badge>
            <span>{name} doesn&rsquo;t publish wages for this job, so national wages are shown.</span>
          </p>
        )}
        {card.path.programs.length > 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">
            {serving
              ? `Programs that serve ${name} are listed first under “Path to get there.”`
              : `None of the local programs listed are in or registered in ${name}.`}
          </p>
        )}
      </>
    );
  }
  return (
    <Factor n={10} title="Location">
      {body}
      <Badge>Metro-level data coming later</Badge>
    </Factor>
  );
}

/** Expand layer: factors 5, 8, 9 and 10 for one card. */
export function ExpandPanel({ card, zip, id }: { card: CardViewModel; zip: ZipStatus; id: string }) {
  return (
    <div id={id} role="region" aria-label={`More about ${card.title.value}`}>
      <CouldI card={card} />
      <WorkEnvironment card={card} />
      <Outlook card={card} />
      <Location card={card} zip={zip} />
    </div>
  );
}
