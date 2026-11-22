/**
 * Quiz copy, word for word from docs/values-quiz.md. Option strings are what
 * QuizResponses stores, so keep them identical to the doc and the fixtures in
 * data/fixtures/. The one deliberate difference: Q10 stores "About 1-2 years"
 * (hyphen, as in the fixtures) and displays the doc's en dash.
 */
import { Q4_OPTIONS, type Q4Label } from "@/lib/data/constants";
import { OUTSIDE_REGION_ZIP_MESSAGE } from "@/lib/shared-text";

export const TOTAL_QUESTIONS = 11;

export const NO_PREFERENCE = "No preference";
export const NOT_SURE = "Not sure";

// Q1 ---------------------------------------------------------------------

export const Q1 = {
  prompt: "Is there a job you've ever imagined having? What draws you to it?",
  jobLabel: "Job",
  becauseLabel: "Because…",
  noJobLink: "I don't have one yet.",
  haveJobLink: "Actually, I do have one in mind.",
  workdayPrompt: "Describe a workday you'd enjoy, from morning to night.",
} as const;

/**
 * Rotating placeholders. Only the doc's own examples for now; the team is
 * still writing the full ~8-per-box pools (open question in the doc).
 */
export const PLACEHOLDERS = {
  q1Job: [
    { job: "Electrician", because: "because I like working with my hands and want to start earning soon." },
    { job: "Game designer", because: "because I love making things other people have fun with." },
  ],
  q1Workday: [
    "I'd start early, spend most of the day solving problems with a small team, and be done by 5.",
  ],
  q3: [
    "My cousins always ask me to fix their phones.",
    "Friends come to me when they need to talk something out.",
  ],
  q9SomethingElse: ["Talking on the phone all day.", "Working underground."],
  followUpQ1Other: ["Getting to be creative every day"],
} as const;

/** Shown near every free-text box. Draft — pending counselor review. */
export const FREE_TEXT_PRIVACY_NOTE =
  "Please don't include personal details like your name, address, ZIP code, family income, race or gender. Your answers are sent to an AI service to find careers. We try to remove some of these details first, but we can't catch everything.";

// Q2 ---------------------------------------------------------------------

export const Q2 = {
  prompt: "Which of these would you enjoy doing on a free afternoon? Pick up to 3.",
  max: 3,
  options: [
    { label: "Fix or build something", icon: "🔧" },
    { label: "Figure out how something works", icon: "⚙️" },
    { label: "Run an experiment", icon: "🧪" },
    { label: "Draw, design or make music", icon: "🎨" },
    { label: "Write or record something for others to see", icon: "🎙️" },
    { label: "Help someone work through a problem", icon: "🤝" },
    { label: "Teach someone a new skill", icon: "🧑‍🏫" },
    { label: "Organize a group or event", icon: "📣" },
    { label: "Start a small business or side hustle", icon: "💡" },
    { label: "Plan a budget or keep things organized", icon: "📋" },
    { label: "Take care of an animal or a garden", icon: "🌱" },
    { label: "Cook for people", icon: "🍳" },
  ],
} as const;
export type Q2Label = (typeof Q2.options)[number]["label"];

// Q3 ---------------------------------------------------------------------

export const Q3 = {
  prompt: "What's something people tend to ask you for help with?",
} as const;

// Q4 ---------------------------------------------------------------------

export const Q4 = {
  prompt: "Which 2 of these matter most to you in a job? Then pick 1 that matters least.",
  labels: Q4_OPTIONS.map((o) => o.label) as Q4Label[],
} as const;

// Q5 ---------------------------------------------------------------------

export const Q5 = {
  prompt: "For each pair, which job sounds better to you?",
  pairs: [
    {
      key: "support_vs_independence",
      a: "Your manager gives you a clear plan to follow",
      b: "You figure out your own way of doing things",
    },
    {
      key: "recognition_vs_relationships",
      a: "Your work gets noticed and you can move up quickly, but it's competitive",
      b: "Your team shares the credit and everyone backs each other up",
    },
    {
      key: "working_conditions_vs_achievement",
      a: "Steady, predictable work, even if the tasks feel similar day to day",
      b: "A chance at big results, even if some projects don't work out",
    },
  ],
} as const;
export type Q5Key = (typeof Q5.pairs)[number]["key"];

// Q6 ---------------------------------------------------------------------

/** Each slider has 3 stops: left (0), the marked middle (1) and right (2). */
export const Q6 = {
  prompt: "Where would you like to spend most of your workday?",
  sliders: [
    { key: "indoors_outdoors", left: "Indoors", right: "Outdoors" },
    { key: "desk_moving", left: "Sitting at a desk", right: "On my feet and moving" },
  ],
} as const;
export type Q6Key = (typeof Q6.sliders)[number]["key"];
export type SliderStop = 0 | 1 | 2;

// Q7 ---------------------------------------------------------------------

export const Q7 = {
  prompt: "How much of your day would you like to spend working with customers, patients or the public?",
  options: ["Most of it", "Some of it", "Very little", NOT_SURE],
} as const;

// Q8 ---------------------------------------------------------------------

export const Q8 = {
  prompt: "What kind of work schedule sounds best to you?",
  /** Shuffled; "No preference" is always added last. */
  regularity: [
    "The same days and hours every week",
    "Hours that change week to week, depending on what's needed",
    "Busy during certain seasons, slower the rest of the year",
  ],
  hoursPrompt: "How many hours a week would you want to work?",
  hours: ["Usually 40 or less", "More than 40 some weeks is fine", NO_PREFERENCE],
} as const;

// Q9 ---------------------------------------------------------------------

export const Q9 = {
  prompt:
    "Are there kinds of things you'd want to avoid in a job? Check any that apply, then pick the specific ones.",
  somethingElse: "Something else",
  none: "None of these",
  categories: [
    {
      id: "physical",
      label: "Physical",
      chips: [
        { label: "Heavy lifting", flag: "heavy_lifting" },
        { label: "Working at heights", flag: "heights" },
        { label: "Cramped or awkward spaces", flag: "cramped" },
        { label: "Driving most of the day", flag: "driving" },
      ],
    },
    {
      id: "surroundings",
      label: "Surroundings",
      chips: [
        { label: "Blood or medical procedures", flag: "blood_medical" },
        { label: "Loud noise", flag: "noise" },
        { label: "Very hot or cold places", flag: "temperature" },
        { label: "Dirt, chemicals or strong smells", flag: "contaminants" },
        { label: "Dangerous tools or machines", flag: "hazardous_equipment" },
        { label: "Being on a computer most of the day", flag: "computer" },
      ],
    },
    {
      id: "schedule",
      label: "Schedule",
      chips: [
        { label: "Night shifts", flag: "night_shifts" },
        { label: "Weekend or holiday work", flag: "weekend_holiday" },
      ],
    },
    {
      id: "people",
      label: "People",
      chips: [
        { label: "Dealing with upset or angry people", flag: "angry_people" },
        { label: "Frequent arguments or conflict", flag: "conflict" },
        { label: "Selling things or meeting sales goals", flag: "sales" },
      ],
    },
    {
      id: "pressure",
      label: "Pressure",
      chips: [
        { label: "Tight deadlines", flag: "time_pressure" },
        { label: "Being responsible for other people's safety", flag: "others_safety" },
        { label: "Work where a mistake could be serious", flag: "consequence_error" },
      ],
    },
  ],
} as const;
export type Q9CategoryId = (typeof Q9.categories)[number]["id"];

// Q10 --------------------------------------------------------------------

export const Q10 = {
  prompt: "How much more school or training after high school are you open to?",
  helper:
    "On average, jobs that need more training pay more. More training also takes more time and can cost more, and there are good-paying jobs at every level.",
  linkText: "See the data (BLS)",
  linkUrl: "https://www.bls.gov/careeroutlook/2026/data-on-display/education-pays.htm",
  /** In order. `value` is stored; `label` is shown. */
  options: [
    { value: "Start working right away", label: "Start working right away" },
    { value: "A few months", label: "A few months" },
    { value: "About 1-2 years", label: "About 1–2 years" },
    { value: "About 4 years", label: "About 4 years" },
    { value: "More than 4 years", label: "More than 4 years" },
    { value: "Not sure yet", label: "Not sure yet" },
  ],
  notSure: "Not sure yet",
  apprenticeship: "I'd be interested in training where I get paid while I learn (an apprenticeship).",
} as const;

// Q11 --------------------------------------------------------------------

export const Q11 = {
  prompt: "What's your ZIP code? (Optional)",
  helper: "We use this to show pay, jobs and in-state school costs near you. We don't save it.",
  /** Shared with the results page's ZIP box (lib/shared-text.ts). */
  outsideRegion: OUTSIDE_REGION_ZIP_MESSAGE,
} as const;

// Follow-ups -------------------------------------------------------------

export const FOLLOW_UPS = {
  q1_reason: {
    prompt: "What part sounds best to you?",
    options: [
      "The work itself",
      "The people",
      "The pay",
      "Making a difference",
      "Being respected",
      "Other",
      NOT_SURE,
    ],
    other: "Other",
  },
  q4_values: {
    prompt:
      "If you had to choose, which matters more: what you do every day, or what you get from it (pay, respect, security)?",
    options: ["What you do every day", "What you get from it (pay, respect, security)", NOT_SURE],
  },
  q10_training: {
    prompt: "Which sounds closer to you right now?",
    options: ["Start earning sooner", "Train longer for more options later", "Still not sure"],
  },
  q2_pick: {
    prompt: "Pick just 1 that sounds least boring.",
  },
} as const;
