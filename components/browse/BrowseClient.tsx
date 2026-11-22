"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VintageBanner } from "@/components/cards/VintageBanner";
import { buttonStyles } from "@/components/ui/button";
import type { BrowseData } from "./data";
import {
  filterCareers,
  MAX_SELECTED,
  NO_FILTERS,
  resultsHref,
  RIASEC_LABELS,
  RIASEC_LETTERS,
  toggleSelected,
  type BrowseCareer,
  type BrowseFilters,
  type RiasecLetter,
} from "./logic";

const selectClass =
  "mt-1 block min-h-12 w-full rounded-xl border border-georgetown-gray bg-white px-3 text-base text-georgetown-blue";

const smallButton =
  "inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-bright-blue underline underline-offset-2 hover:text-georgetown-blue";

export function BrowseClient({ careers, educationOptions, jobZoneOptions, sources }: BrowseData) {
  const [filters, setFilters] = useState<BrowseFilters>(NO_FILTERS);
  const [selected, setSelected] = useState<string[]>([]);

  const shown = useMemo(() => filterCareers(careers, filters), [careers, filters]);
  const hasFilters = filters.education !== null || filters.jobZone !== null || filters.riasec !== null;
  const full = selected.length === MAX_SELECTED;
  const href = resultsHref(selected);
  const toggle = (soc: string) => setSelected((s) => toggleSelected(s, soc));
  const titleOf = (soc: string) => careers.find((c) => c.soc_code === soc)?.title ?? soc;

  return (
    <div>
      <form aria-label="Filter careers" className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <label className="text-sm font-medium">
          Education to start
          <select
            className={selectClass}
            value={filters.education ?? ""}
            onChange={(e) => setFilters({ ...filters, education: e.target.value || null })}
          >
            <option value="">Any</option>
            {educationOptions.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Job Zone (preparation needed)
          <select
            className={selectClass}
            value={filters.jobZone ?? ""}
            onChange={(e) => setFilters({ ...filters, jobZone: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Any</option>
            {jobZoneOptions.map((z) => (
              <option key={z.value} value={z.value}>
                {z.value}: {z.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Interest type (RIASEC)
          <select
            className={selectClass}
            value={filters.riasec ?? ""}
            onChange={(e) => setFilters({ ...filters, riasec: (e.target.value || null) as RiasecLetter | null })}
          >
            <option value="">Any</option>
            {RIASEC_LETTERS.map((l) => (
              <option key={l} value={l}>
                {l}: {RIASEC_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="mt-4 flex min-h-11 items-center justify-between gap-3">
        <p role="status" className="text-sm text-body">
          Showing {shown.length} of {careers.length} careers
        </p>
        {hasFilters && (
          <button type="button" className={smallButton} onClick={() => setFilters(NO_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="mt-2 rounded-[20px] bg-tint p-5">
          No careers match all three filters. Try changing or clearing one.
        </p>
      ) : (
        <ul className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <CareerOption
              key={c.soc_code}
              career={c}
              checked={selected.includes(c.soc_code)}
              disabled={full && !selected.includes(c.soc_code)}
              onToggle={() => toggle(c.soc_code)}
            />
          ))}
        </ul>
      )}

      <div className="mt-6">
        <VintageBanner sources={sources} />
      </div>

      <section
        aria-label="Your picks"
        className="sticky bottom-3 z-10 mt-6 rounded-[20px] border border-light-gray bg-white px-4 py-3 shadow-lg print:hidden"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p aria-live="polite" className="text-sm font-medium">
              {selected.length} of {MAX_SELECTED} selected
              {!full && ` · pick ${MAX_SELECTED - selected.length} more to compare`}
            </p>
            {selected.length > 0 && (
              <ul className="flex flex-wrap gap-x-2">
                {selected.map((soc) => (
                  <li key={soc} className="min-w-0">
                    <button
                      type="button"
                      className={`${smallButton} max-w-full text-left`}
                      aria-label={`Remove ${titleOf(soc)}`}
                      onClick={() => toggle(soc)}
                    >
                      <span className="max-w-64 truncate">{titleOf(soc)}</span>
                      <span aria-hidden="true" className="ml-1">
                        ×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {href ? (
            <Link
              href={href}
              prefetch={false}
              className={`${buttonStyles.compact} shrink-0`}
            >
              Compare these 3
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className={`${buttonStyles.compact} shrink-0`}
            >
              Compare these 3
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function CareerOption({
  career: c,
  checked,
  disabled,
  onToggle,
}: {
  career: BrowseCareer;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={`rounded-[20px] border p-5 ${
        checked ? "border-bright-blue bg-highlight" : "border-light-gray bg-white"
      }`}
    >
      <label className={`flex min-h-11 items-start gap-3 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="mt-0.5 size-5 shrink-0 scroll-mb-72 accent-bright-blue sm:scroll-mb-40"
        />
        <span className="min-w-0 font-display text-lg leading-snug font-bold break-words text-georgetown-blue">{c.title}</span>
      </label>
      <dl className="mt-1 space-y-1 text-sm text-body">
        <div>
          <dt className="inline font-medium">Education: </dt>
          <dd className="inline">{c.entry_education}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Job Zone {c.job_zone}: </dt>
          <dd className="inline">{c.job_zone_label}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Interests: </dt>
          <dd className="inline">{c.riasec_code.split("").join(", ")}</dd>
        </div>
      </dl>
      <details className="mt-2 text-sm">
        <summary className="flex min-h-11 scroll-mb-72 cursor-pointer items-center font-medium text-bright-blue underline underline-offset-2 sm:scroll-mb-40">
          What they do
        </summary>
        <p className="text-body">{c.description}</p>
      </details>
    </li>
  );
}
