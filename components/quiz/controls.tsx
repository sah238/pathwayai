"use client";

import type { ReactNode } from "react";

const optionCard =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-light-gray bg-white px-4 py-3 text-base " +
  "has-checked:border-bright-blue has-checked:bg-highlight has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-bright-blue " +
  "has-disabled:cursor-not-allowed has-disabled:bg-tint has-disabled:text-body";

const inputClass = "size-5 shrink-0 accent-bright-blue focus-visible:outline-none";

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-body">{label}</p>
      <div
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={label}
        className="h-2 w-full overflow-hidden rounded-full bg-tint"
      >
        <div
          className="h-full rounded-full bg-bright-blue transition-[width]"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Single choice as native radios styled as cards. */
export function ChoiceList({
  name,
  labelledBy,
  options,
  value,
  onChange,
}: {
  name: string;
  labelledBy: string;
  options: readonly { value: string; label: ReactNode }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-col gap-2">
      {options.map((o) => (
        <label key={o.value} className={optionCard}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className={inputClass}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function CheckCard({
  checked,
  disabled,
  onChange,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={optionCard}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={inputClass}
      />
      <span>{children}</span>
    </label>
  );
}

/** A small pill checkbox, used for Q9 chips. */
export function Chip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-2 text-sm " +
        "has-checked:border-bright-blue has-checked:bg-highlight has-focus-visible:outline-2 has-focus-visible:outline-bright-blue"
      }
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-bright-blue focus-visible:outline-none"
      />
      {children}
    </label>
  );
}

/**
 * Text box whose example disappears as the student types. The question stays
 * visible as a real label. Georgetown Gray on white meets WCAG AA (5.77:1).
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline,
  maxLength,
  optional,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  maxLength: number;
  optional?: boolean;
  /** id of a note that screen readers should read with this box. */
  describedBy?: string;
}) {
  const field =
    "w-full rounded-xl border border-georgetown-gray bg-white px-4 py-3 text-base text-georgetown-blue placeholder:text-georgetown-gray " +
    "focus:border-bright-blue focus:outline-2 focus:outline-bright-blue";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
        {optional && <span className="font-normal text-body"> (optional)</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={field}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={field}
        />
      )}
    </div>
  );
}

/** A 3-stop slider: left, marked middle ("No preference"), right. */
export function StopSlider({
  id,
  left,
  right,
  middle,
  value,
  onChange,
}: {
  id: string;
  left: string;
  right: string;
  middle: string;
  value: 0 | 1 | 2;
  onChange: (value: 0 | 1 | 2) => void;
}) {
  const text = [left, middle, right][value];
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-light-gray p-4">
      <label htmlFor={id} className="sr-only">
        {left} or {right}
      </label>
      <div className="flex justify-between gap-4 text-sm font-medium">
        <span className={value === 0 ? "text-bright-blue" : ""}>{left}</span>
        <span className={`text-right ${value === 2 ? "text-bright-blue" : ""}`}>{right}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={2}
        step={1}
        value={value}
        aria-valuetext={text}
        onChange={(e) => onChange(Number(e.target.value) as 0 | 1 | 2)}
        className="h-8 w-full accent-bright-blue"
      />
      <div className="relative flex justify-center text-sm">
        <span aria-hidden className="absolute -top-3 h-2 w-0.5 bg-georgetown-gray" />
        <span className={value === 1 ? "font-medium text-bright-blue" : "text-body"}>
          {middle}
        </span>
      </div>
      <p className="text-sm text-body" aria-hidden>
        Your pick: <strong>{text}</strong>
      </p>
    </div>
  );
}

/** Restates an earlier answer on a follow-up screen. */
export function Recap({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-tint px-4 py-3 text-base text-georgetown-blue">
      {children}
    </p>
  );
}
