"use client";

import { DraftLabel } from "@/components/ui/DraftLabel";
import type { Q4Label } from "@/lib/data/constants";
import { CheckCard, ChoiceList, Chip, Recap, StopSlider, TextField } from "./controls";
import { isValidZip, q4Complete, tapQ4, zipRegionMessage, type FollowUpId, type QuizState } from "./logic";
import {
  FOLLOW_UPS,
  FREE_TEXT_PRIVACY_NOTE,
  NO_PREFERENCE,
  PLACEHOLDERS,
  Q1,
  Q10,
  Q11,
  Q2,
  Q3,
  Q4,
  Q5,
  Q6,
  Q7,
  Q8,
  Q9,
  type Q2Label,
} from "./questions";

export const HEADING_ID = "quiz-question";

type Update = (fn: (s: QuizState) => QuizState) => void;
type ScreenProps = { s: QuizState; update: Update; /** 0–1, re-rolled each time a screen opens. */ seed: number };

const pick = <T,>(pool: readonly T[], seed: number): T => pool[Math.floor(seed * pool.length) % pool.length];
const ICONS = Object.fromEntries(Q2.options.map((o) => [o.label, o.icon])) as Record<Q2Label, string>;
const toggle = <T,>(list: readonly T[], item: T, on: boolean): T[] =>
  on ? (list.includes(item) ? [...list] : [...list, item]) : list.filter((x) => x !== item);

/** The question text shown as the screen's heading. */
export function promptFor(step: number, s: QuizState, followUp: FollowUpId | undefined): string {
  if (followUp) return FOLLOW_UPS[followUp].prompt;
  const prompts = [
    s.q1.mode === "job" ? Q1.prompt : Q1.workdayPrompt,
    Q2.prompt,
    Q3.prompt,
    Q4.prompt,
    Q5.prompt,
    Q6.prompt,
    Q7.prompt,
    Q8.prompt,
    Q9.prompt,
    Q10.prompt,
    Q11.prompt,
  ];
  return prompts[step];
}

const linkButton =
  "self-start text-base font-medium text-bright-blue underline underline-offset-4 hover:text-georgetown-blue";

const PRIVACY_NOTE_ID = "free-text-privacy-note";

function FreeTextNote() {
  return (
    <div id={PRIVACY_NOTE_ID} className="rounded-xl bg-tint px-4 py-3">
      <p className="text-sm text-body">{FREE_TEXT_PRIVACY_NOTE}</p>
      <DraftLabel className="mt-1" />
    </div>
  );
}

function Q1Screen({ s, update, seed }: ScreenProps) {
  const ex = pick(PLACEHOLDERS.q1Job, seed);
  const setQ1 = (patch: Partial<QuizState["q1"]>) => update((st) => ({ ...st, q1: { ...st.q1, ...patch } }));
  if (s.q1.mode === "workday") {
    return (
      <div className="flex flex-col gap-4">
        <FreeTextNote />
        <TextField
          id="q1-workday"
          label="My ideal workday"
          value={s.q1.workday}
          onChange={(workday) => setQ1({ workday })}
          placeholder={pick(PLACEHOLDERS.q1Workday, seed)}
          multiline
          maxLength={500}
          describedBy={PRIVACY_NOTE_ID}
        />
        <button type="button" className={linkButton} onClick={() => setQ1({ mode: "job" })}>
          {Q1.haveJobLink}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <FreeTextNote />
      <TextField
        id="q1-job"
        label={Q1.jobLabel}
        value={s.q1.job}
        onChange={(job) => setQ1({ job })}
        placeholder={ex.job}
        maxLength={100}
        describedBy={PRIVACY_NOTE_ID}
      />
      <TextField
        id="q1-because"
        label={Q1.becauseLabel}
        value={s.q1.because}
        onChange={(because) => setQ1({ because })}
        placeholder={ex.because}
        multiline
        maxLength={300}
        describedBy={PRIVACY_NOTE_ID}
      />
      <button type="button" className={linkButton} onClick={() => setQ1({ mode: "workday" })}>
        {Q1.noJobLink}
      </button>
    </div>
  );
}

function Q2Screen({ s, update }: ScreenProps) {
  const full = s.q2.length >= Q2.max;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{Q2.prompt}</legend>
      <p className="text-sm text-body" aria-live="polite">
        {s.q2.length} of {Q2.max} picked
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {s.order.q2.map((label) => (
          <CheckCard
            key={label}
            checked={s.q2.includes(label)}
            disabled={full && !s.q2.includes(label)}
            onChange={(on) => update((st) => ({ ...st, q2: toggle(st.q2, label, on) }))}
          >
            <span aria-hidden className="mr-2 text-xl">
              {ICONS[label]}
            </span>
            {label}
          </CheckCard>
        ))}
      </div>
    </fieldset>
  );
}

function Q3Screen({ s, update, seed }: ScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <FreeTextNote />
      <TextField
        id="q3"
        label="People ask me to help with…"
        value={s.q3}
        onChange={(q3) => update((st) => ({ ...st, q3 }))}
        placeholder={pick(PLACEHOLDERS.q3, seed)}
        multiline
        maxLength={300}
        optional
        describedBy={PRIVACY_NOTE_ID}
      />
    </div>
  );
}

function Q4Screen({ s, update, onSkip }: ScreenProps & { onSkip: () => void }) {
  const { most, least } = s.q4;
  const done = q4Complete(s.q4);
  const badge = (label: Q4Label) =>
    most.includes(label) ? "Matters most" : least === label ? "Matters least" : null;
  const hint =
    most.length < 2
      ? `Tap ${2 - most.length === 2 ? "2 cards" : "1 more card"} that matter most.`
      : least === null
        ? "Now tap 1 card that matters least."
        : "All set. Tap a card again to change it.";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-body" aria-live="polite">
        {hint}
      </p>
      <ul className="flex flex-col gap-2">
        {s.order.q4.map((label) => {
          const b = badge(label);
          return (
            <li key={label}>
              <button
                type="button"
                aria-pressed={b !== null}
                disabled={done && b === null}
                onClick={() => update((st) => ({ ...st, q4: tapQ4(st.q4, label) }))}
                className={
                  "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base " +
                  "disabled:cursor-not-allowed disabled:bg-tint disabled:text-georgetown-gray " +
                  (b === "Matters most"
                    ? "border-bright-blue bg-highlight"
                    : b === "Matters least"
                      ? "border-warn-line bg-warn-tint"
                      : "border-light-gray bg-white")
                }
              >
                <span>{label}</span>
                {b && (
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white " +
                      (b === "Matters most" ? "bg-bright-blue" : "bg-warn")
                    }
                  >
                    {b}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className={linkButton} onClick={onSkip}>
        Skip this question
      </button>
    </div>
  );
}

function Q5Screen({ s, update }: ScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      {Q5.pairs.map((pair, i) => (
        <div key={pair.key} className="flex flex-col gap-2">
          <p id={`q5-${pair.key}`} className="font-medium">
            Pair {i + 1} of {Q5.pairs.length}
          </p>
          <ChoiceList
            name={`q5-${pair.key}`}
            labelledBy={`q5-${pair.key}`}
            options={[pair.a, pair.b, NO_PREFERENCE].map((v) => ({ value: v, label: v }))}
            value={s.q5[pair.key]}
            onChange={(v) => update((st) => ({ ...st, q5: { ...st.q5, [pair.key]: v } }))}
          />
        </div>
      ))}
    </div>
  );
}

function Q6Screen({ s, update }: ScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      {Q6.sliders.map((sl) => (
        <StopSlider
          key={sl.key}
          id={`q6-${sl.key}`}
          left={sl.left}
          right={sl.right}
          middle={NO_PREFERENCE}
          value={s.q6[sl.key]}
          onChange={(v) => update((st) => ({ ...st, q6: { ...st.q6, [sl.key]: v } }))}
        />
      ))}
    </div>
  );
}

function Q7Screen({ s, update }: ScreenProps) {
  return (
    <ChoiceList
      name="q7"
      labelledBy={HEADING_ID}
      options={Q7.options.map((v) => ({ value: v, label: v }))}
      value={s.q7}
      onChange={(q7) => update((st) => ({ ...st, q7 }))}
    />
  );
}

function Q8Screen({ s, update }: ScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <ChoiceList
        name="q8-regularity"
        labelledBy={HEADING_ID}
        options={s.order.q8.map((v) => ({ value: v, label: v }))}
        value={s.q8.regularity}
        onChange={(regularity) => update((st) => ({ ...st, q8: { ...st.q8, regularity } }))}
      />
      <div className="flex flex-col gap-2">
        <h2 id="q8-hours" className="text-lg font-semibold">
          {Q8.hoursPrompt}
        </h2>
        <ChoiceList
          name="q8-hours"
          labelledBy="q8-hours"
          options={Q8.hours.map((v) => ({ value: v, label: v }))}
          value={s.q8.weekly_hours}
          onChange={(weekly_hours) => update((st) => ({ ...st, q8: { ...st.q8, weekly_hours } }))}
        />
      </div>
    </div>
  );
}

function Q9Screen({ s, update, seed }: ScreenProps) {
  const setQ9 = (patch: Partial<QuizState["q9"]>) => update((st) => ({ ...st, q9: { ...st.q9, ...patch } }));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{Q9.prompt}</legend>
      {Q9.categories.map((c) => {
        const open = s.q9.categories.includes(c.id);
        return (
          <div key={c.id} className="flex flex-col gap-2">
            <CheckCard
              checked={open}
              disabled={s.q9.none}
              onChange={(on) => setQ9({ categories: toggle(s.q9.categories, c.id, on) })}
            >
              {c.label}
            </CheckCard>
            {open && (
              <fieldset className="ml-4 flex flex-col gap-2 border-l-2 border-light-gray pl-4">
                <legend className="mb-2 text-sm text-body">
                  Which {c.label.toLowerCase()} things would you avoid?
                </legend>
                <div className="flex flex-wrap gap-2">
                  {s.order.q9[c.id].map((chip) => (
                    <Chip
                      key={chip}
                      checked={s.q9.chips.includes(chip)}
                      onChange={(on) => setQ9({ chips: toggle(s.q9.chips, chip, on) })}
                    >
                      {chip}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        );
      })}
      <CheckCard
        checked={s.q9.somethingElseChecked}
        disabled={s.q9.none}
        onChange={(somethingElseChecked) => setQ9({ somethingElseChecked })}
      >
        {Q9.somethingElse}
      </CheckCard>
      {s.q9.somethingElseChecked && !s.q9.none && (
        <>
          <FreeTextNote />
          <TextField
            id="q9-something-else"
            label="What else would you avoid?"
            value={s.q9.somethingElse}
            onChange={(somethingElse) => setQ9({ somethingElse })}
            placeholder={pick(PLACEHOLDERS.q9SomethingElse, seed)}
            maxLength={200}
            describedBy={PRIVACY_NOTE_ID}
          />
        </>
      )}
      <CheckCard checked={s.q9.none} onChange={(none) => setQ9({ none })}>
        {Q9.none}
      </CheckCard>
    </fieldset>
  );
}

function Q10Screen({ s, update }: ScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-body">
        {Q10.helper}{" "}
        <a
          href={Q10.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-bright-blue underline underline-offset-4"
        >
          {Q10.linkText}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
      <ChoiceList
        name="q10"
        labelledBy={HEADING_ID}
        options={Q10.options}
        value={s.q10.choice}
        onChange={(choice) => update((st) => ({ ...st, q10: { ...st.q10, choice } }))}
      />
      <CheckCard
        checked={s.q10.apprenticeship}
        onChange={(apprenticeship) => update((st) => ({ ...st, q10: { ...st.q10, apprenticeship } }))}
      >
        {Q10.apprenticeship}
      </CheckCard>
    </div>
  );
}

function Q11Screen({ s, update }: ScreenProps) {
  const invalid = s.q11.trim() !== "" && !isValidZip(s.q11);
  const regionNote = zipRegionMessage(s.q11);
  const describedBy = ["q11-help", invalid && "q11-error", regionNote && "q11-region"].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="q11" className="font-medium">
        ZIP code
      </label>
      <p id="q11-help" className="text-sm text-body">
        {Q11.helper}
      </p>
      <input
        id="q11"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        value={s.q11}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onChange={(e) => update((st) => ({ ...st, q11: e.target.value.replace(/\D/g, "") }))}
        className="w-40 rounded-xl border border-georgetown-gray bg-white px-4 py-3 text-lg tracking-widest focus:border-bright-blue focus:outline-2 focus:outline-bright-blue"
      />
      {invalid && (
        <p id="q11-error" className="text-sm text-red-700">
          A ZIP code has 5 digits. You can also leave this blank.
        </p>
      )}
      <p id="q11-region" role="status" className="text-sm text-georgetown-blue">
        {regionNote}
      </p>
    </div>
  );
}

const QUESTION_SCREENS = [
  Q1Screen,
  Q2Screen,
  Q3Screen,
  null, // Q4 needs onSkip
  Q5Screen,
  Q6Screen,
  Q7Screen,
  Q8Screen,
  Q9Screen,
  Q10Screen,
  Q11Screen,
] as const;

export function QuestionScreen({ step, onSkipQ4, ...props }: ScreenProps & { step: number; onSkipQ4: () => void }) {
  const Screen = QUESTION_SCREENS[step];
  return (
    <>
      {step === 3 ? <Q4Screen {...props} onSkip={onSkipQ4} /> : Screen ? <Screen {...props} /> : null}
      <DraftLabel />
    </>
  );
}

// Follow-ups -------------------------------------------------------------

/** One sentence restating the answer a follow-up is about, since it appears after Q11. */
function recapFor(id: FollowUpId, s: QuizState): string {
  switch (id) {
    case "q1_reason": {
      const job = s.q1.job.trim();
      const because = s.q1.because.trim().replace(/^because\s+/i, "");
      return because
        ? `You said your dream job is “${job}” because ${because.replace(/[.!]+$/, "")}.`
        : `You said your dream job is “${job}.”`;
    }
    case "q4_values":
      return !q4Complete(s.q4)
        ? "You skipped the question about which things matter most to you in a job."
        : "For the three “which job sounds better” pairs, you picked “No preference” each time.";
    case "q10_training":
      return "You said you're not sure yet how much more school or training you're open to.";
    case "q2_pick":
      return "You didn't pick any of the free-afternoon activities. That's okay!";
  }
}

export function FollowUpScreen(props: ScreenProps & { id: FollowUpId }) {
  return (
    <>
      <FollowUpBody {...props} />
      <DraftLabel />
    </>
  );
}

function FollowUpBody({ id, s, update, seed }: ScreenProps & { id: FollowUpId }) {
  const setFU = <K extends keyof QuizState["followUps"]>(key: K, value: QuizState["followUps"][K]) =>
    update((st) => ({ ...st, followUps: { ...st.followUps, [key]: value } }));
  const recap = <Recap>{recapFor(id, s)}</Recap>;

  if (id === "q1_reason") {
    const fu = s.followUps.q1_reason;
    return (
      <div className="flex flex-col gap-4">
        {recap}
        <ChoiceList
          name="fu-q1"
          labelledBy={HEADING_ID}
          options={FOLLOW_UPS.q1_reason.options.map((v) => ({ value: v, label: v }))}
          value={fu.choice}
          onChange={(choice) => setFU("q1_reason", { ...fu, choice })}
        />
        {fu.choice === FOLLOW_UPS.q1_reason.other && (
          <>
            <FreeTextNote />
            <TextField
              id="fu-q1-other"
              label="What part?"
              value={fu.other}
              onChange={(other) => setFU("q1_reason", { ...fu, other })}
              placeholder={pick(PLACEHOLDERS.followUpQ1Other, seed)}
              maxLength={200}
              describedBy={PRIVACY_NOTE_ID}
            />
          </>
        )}
      </div>
    );
  }

  if (id === "q2_pick") {
    return (
      <div className="flex flex-col gap-4">
        {recap}
        <ChoiceList
          name="fu-q2"
          labelledBy={HEADING_ID}
          options={s.order.q2.map((label) => ({
            value: label,
            label: (
              <>
                <span aria-hidden className="mr-2 text-xl">
                  {ICONS[label]}
                </span>
                {label}
              </>
            ),
          }))}
          value={s.followUps.q2_pick}
          onChange={(v) => setFU("q2_pick", v as Q2Label)}
        />
      </div>
    );
  }

  const key = id; // "q4_values" | "q10_training"
  return (
    <div className="flex flex-col gap-4">
      {recap}
      <ChoiceList
        name={`fu-${key}`}
        labelledBy={HEADING_ID}
        options={FOLLOW_UPS[key].options.map((v) => ({ value: v, label: v }))}
        value={s.followUps[key]}
        onChange={(v) => setFU(key, v)}
      />
    </div>
  );
}
