# PathwayAI – Project Context for AI Assistants

> Use this file as context when working on any PathwayAI component. In the Claude Code repo, save it as `CLAUDE.md` in the root. Source of truth: the team's working doc. Last synced 2026-11-20 (Career Card Layers and beta phasing added).

## Rules for any AI working on this project

1. **The AI handles language; the code handles numbers.** Never generate, estimate or "fill in" a wage, cost, growth rate, payback figure or any other statistic. Every number comes from the JSON dataset or from deterministic backend code.  
2. **MVP scope is DC, Maryland and Virginia only.** Don't build for other states unless asked.  
3. **Missing data is `null`, never `0`.** "PrivacySuppressed" and blank cells become `null` and show a visible badge plus a fallback.  
4. **No student data is stored.** No accounts, names, emails, GPAs, demographics, persistent cookies or prompt/response logging. Selections live only in browser memory.  
5. **Never pass race, gender or household income into Stage 1 matching.** Income is used only in the net price lookup after matching.  
6. **All external calls (Gemini, BLS, O\*NET, HUD, Scorecard) run server-side.** Keys only in a gitignored `.env`. Never in front-end code.  
7. **Every displayed value carries `data_vintage` and `source_url`.**  
8. If something below is listed under Open Questions, ask the team rather than guessing.

## Component map

| Component | Owner | Sections to read |
| :---- | :---- | :---- |
| JSON dataset (`occupations.json`, `institutions.json`, `zip_cbsa.json`) | Kamya (built with Gemini) | Data Sources, Beta Dataset, Career Card Layers (Beta Phasing), Calculation Rules (missing data), Validation |
| Data adapters and lookup | Maylene, Sean, Sophie (Claude Code) | Technical Architecture, Data Sources (join rules) |
| ROI and calculation engine | Maylene, Sean, Sophie | Calculation Rules |
| Claude orchestration (Stage 1 / Stage 2\) | Maylene, Sean, Sophie | How It Works, Privacy, Bias and Compliance |
| Values quiz | Maylene, Sean, Sophie | Core Features, How It Works |
| Three-card dashboard, guardrails, counselor guide | Maylene, Sean, Sophie | Core Features, Career Card Layers, AI Impact Signals, Privacy, Bias and Compliance |
| Testing and validation | Maylene, Sean, Sophie | Validation and Pass Criteria |
| Report and demo | Avis, Jack | Overview, Problem, Milestones |

---

## Overview

PathwayAI is a web app that helps high school students who are unsure about their future find careers that fit them. A student describes what they want in plain English and takes a short values quiz. PathwayAI then returns three contrasting career cards built from public federal data. Team 7 is building a working beta for the Class 9 demonstration. To ship a minimum viable product by the deadline, the beta covers DC, Maryland and Virginia only.

**Core design rule: the AI handles language, the code handles numbers.** Claude only interprets what the student types and writes plain-English explanations. Every wage, cost, growth figure and payback number comes from pre-built data tables and deterministic backend code, never from the model.

## Problem

Students often choose a path without solid information on pay, cost or what the work is actually like, and counselors are stretched thin. Public high school counselors average 372 students each, and only 40% of high schoolers discuss starting salaries before taking on education costs. PathwayAI gives accessible, sourced guidance that prepares students for a conversation with a counselor or family. It does not replace that conversation.

## Target Users

- **Primary:** high school sophomores, juniors and seniors who are undecided about a career  
- **Secondary:** school counselors and families, who receive the printable discussion guide  
- **Constraint:** users are minors, so v1 is stateless and account-free (see Privacy, Bias and Compliance)

## Core Features

1. **Plain-language input:** students type goals in their own words ("I like helping people but don't want to sit at a desk"), with an optional ZIP code in DC, Maryland or Virginia.  
2. **Values quiz:** identifies what the student values, mapped to O\*NET Work Values (Achievement, Independence, Recognition, Relationships, Support, Working Conditions), work-context preferences (indoor or outdoor, physical activity, public contact) and how much training they are willing to do.  
3. **Three-card comparison:** every result shows three contrasting roles side by side:  
   1. a direct interest match  
   2. a high-ROI apprenticeship or two-year path  
   3. an "Adjacent Discovery" role students rarely encounter  
4. **Career cards:** ten factors in two on-screen layers, glance and expand (see Career Card Layers). PathwayAI is a discovery tool: the card is built to help students rule careers *in*, not out.  
5. **Printable counselor discussion guide:** the third layer of the card. A one-page export with a strengths-and-growth reflection, the shortlist and related careers, conversation prompts for a counselor or family, and cost and aid details.  
6. **Fallback browse mode:** filters careers without calling the AI, so the demo still works if Claude is down.  
7. **Spanish support (later):** career content via O\*NET's Mi Próximo Paso, with numbers kept unchanged.

## Career Card Layers

**Design principle: PathwayAI is a discovery tool.** The card helps students rule careers *in*. Factors that build curiosity and confidence (fit, values, "could I do this?", where it leads) come before factors that tend to rule careers out (outlook, cost detail).

The card has three layers:

- **Glance** (always visible): four factors, lined up across all three cards so students can compare them side by side. It answers "is this for me?"  
- **Expand** (tap to open): six factors, one card at a time. It answers "what would it be like?" Discovery factors 5 and 6 are listed first.  
- **Guide** (printable): taken to a counselor or family. It answers "what do I do next?"

### The ten factors

| \# | Layer | Factor | What the student sees | Data source |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Glance | A day in this job | What you'd actually do | O\*NET tasks, interests |
| 2 | Glance | Why it fits you | The student's matched quiz values, shown back to them | O\*NET Work Values |
| 3 | Glance | Pay | 10th, 25th, median and 90th percentile wages; metro, then state, then national | BLS OEWS, May 2025 |
| 4 | Glance | Path to get there | Entry education, Job Zone, apprenticeship option, net price by income, time and cost to first paycheck | BLS Table 1.2, O\*NET, CareerOneStop, DOL RAPIDS, College Scorecard |
| 5 | Expand | Could I do this? | Skills you'd build, first step from high school, and a reminder that it's never too late to pivot or learn | O\*NET Skills, Knowledge, Job Zone |
| 6 | Expand | Where it leads | Related careers to explore next | O\*NET related occupations |
| 7 | Expand | Schedule and balance | Typical weekly hours; regular or irregular schedule | O\*NET Work Context (confirm fields) |
| 8 | Expand | Work environment | Indoor or outdoor, physical demands, public contact, injury rates, benefits (group level) | O\*NET Work Context, BLS SOII, BLS NCS |
| 9 | Expand | Outlook and AI | 10-year growth and openings, AI exposure tier, early-career caution, task split | BLS Projections 2025–35, Projections Central, BLS AI exposure categories |
| 10 | Expand | Location | Local demand, wage adjusted for local prices, rent as a share of entry pay | Projections Central, BEA RPP, HUD FMR |

### The guide layer

| Section | What it contains | Source |
| :---- | :---- | :---- |
| My strengths and growth | Prompts: what I'm good at, what's hard for me, what I want to develop. States plainly that pivoting and learning later is normal. | Fixed prompts (no student data); continues factor 5 |
| My shortlist and what's next | The three cards plus related careers worth a look | Factors 1–4 and 6 |
| Talk it through | Questions to bring to a counselor and family, including what family expects | Fixed prompts (no student data) |
| Cost and aid details | Net price by income tier, schools, programs, net price calculator link | College Scorecard, studentaid.gov, state programs |

Every results screen also shows the vintage banner, missing-data badges and the "not a guarantee" note (see Privacy, Bias and Compliance).

### Grounding rules for card text

- **"A day in this job" is AI-written text in the glance layer.** AImay summarize only the O\*NET task list for that occupation, the same way Stage 2 summaries are grounded. No invented duties.  
- **"Could I do this?" stays factual on the card** (skills, Job Zone, first step). The reflection prompts live in the guide, not on screen.  
- **Family expectations, role models and prestige are guide prompts only.** They never feed matching (see the anti-bias rule).  
- **Time to first paycheck** comes from a reviewed lookup table mapping each education or training level to a typical length. AI never estimates it.  
- **Dropped from the card:** travel (no clean source). Self-employed earnings fold into Pay; benefits fold into Work environment.

### Beta phasing

A factor goes in **Beta core** only if its data is already in the milestone 1 dataset or it needs no data at all.

- **Beta core (milestones 1–5):** must work at the Class 9 demo.  
- **Beta stretch (milestones 6–7):** Addendum A work already planned before the demo.  
- **Finished product:** after the class.

| Factor | Beta core (M1–5) | Beta stretch (M6–7) | Finished product |
| :---- | :---- | :---- | :---- |
| 1 · A day in this job | Top O\*NET tasks, summarized from the task list only | Task split labels (Automated, Augmented, Human-Centric) | Spanish via Mi Próximo Paso |
| 2 · Why it fits you | Top 2 matched O\*NET Work Values shown back | — | Fit explained with work-context matches too |
| 3 · Pay | OEWS percentiles, metro → state → national fallback | Real wage adjusted for cost of living | Self-employed earnings (ACS PUMS) |
| 4 · Path to get there | Entry education, Job Zone, apprenticeship option, net price by income tier | Time to first paycheck, completion-adjusted premium | Labeled earnings horizons (PSEO), school risk badges |
| 5 · Could I do this? | Job Zone plus first step from high school; static "never too late" message | Top O\*NET skills you'd build | Skills linked to school courses and activities |
| 6 · Where it leads | — | Related careers within the beta roster only | Full career ladders, links beyond the roster |
| 7 · Schedule and balance | — | Weekly hours and schedule regularity, once O\*NET fields are confirmed | Add a second source if Work Context is too coarse |
| 8 · Work environment | Indoor/outdoor, physical activity, public contact (already in the quiz) | Injury rates and benefits at group level | — |
| 9 · Outlook and AI | National 10-year growth, openings, AI exposure tier, early-career flag | State projections (Projections Central) | Anthropic Economic Index cross-check |
| 10 · Location | ZIP → metro matching for wages, DC/MD/VA | Cost of living, rent share of entry pay | National coverage |
| Guide: strengths and growth | Fixed reflection prompts | Counselor-reviewed wording | Spanish version |
| Guide: shortlist | Three cards in print view | Related careers added | — |
| Guide: talk it through | Fixed counselor and family prompts | Counselor sign-off | — |
| Guide: cost and aid | Net price, school list, net price calculator link | Hand-curated DC/MD/VA state aid programs | All states' programs |

**If time runs short in milestone 6:** cut cost of living first and protect "Where it leads", since it best serves the discovery goal. Without the stretch items, the core still works as a discovery demo.

## How It Works

1. The student types a goal, takes the quiz and optionally enters a ZIP code.  
2. **Stage 1, intent extraction:** Gemini turns the text into structured JSON: interest tags, work values, work context, maximum education, Job Zone ceiling, ZIP, and two flags, `is_career_query` and `has_constraint_conflict`. The server validates it with Pydantic or Zod and rejects any value outside the fixed lists.  
3. **Routing:** an off-topic prompt gets a friendly nudge back to careers. A contradictory one ("surgeon with zero years of school") shows the real path plus short-training alternatives such as medical assistant or phlebotomist.  
4. **Deterministic retrieval:** the backend picks the three roles from the dataset and computes every number.  
5. **Stage 2, grounded summaries:** Gemini receives only those verified records and writes jargon-free summaries at about an 8th–9th grade reading level, citing the exact figures.  
6. The student compares cards, asks follow-ups and exports the counselor guide.

## Technical Architecture

- **Build tool:** the app is built with Claude Code by Maylene, Sean and Sophie.  
- **Data:** Kamya builds the JSON dataset with Gemini from the federal source files (`occupations.json`, `institutions.json`, `zip_cbsa.json`). Every value should trace to a source file and row (see Validation). At national scale the same code reads from a server-side database refreshed quarterly or annually. No live government API calls while a student waits: they add latency and rate-limit risk (the BLS API allows 500 queries a day).  
- **Data adapters:** a Repository/Data-Adapter pattern behind four entities: `Occupation`, `AreaWages`, `InstitutionProgram`, `ZipToCbsa`. New data layers plug in as optional adapters without changing the front end or matching logic.  
- **LLM in the app:** Gemini on a **Paid Tier** key, because Free Tier prompts may be used to improve Google's products. Move to Vertex AI with Zero Data Retention before any school pilot.  
- **Security:** every external call runs server-side. Keys live in a gitignored `.env`; commit a blank `.env.example` (`GEMINI_API_KEY`, `ONET_API_KEY`, `BLS_API_KEY`, `HUD_BEARER_TOKEN`). Turn on GitHub secret scanning and protect `main` with required pull-request reviews.  
- **Operations:** per-IP throttling, request length caps and billing alerts; no prompts or responses in logs; student text never goes into system instructions.  
- **Front end and hosting:** not yet chosen (see Open Questions).

## Data Sources

Every stored value carries a `data_vintage` and `source_url` so the attribution banner fills in automatically. Download links, field names and parsing rules are in the Build Team Data Blueprint. For the MVP, filter the state and metro files to DC, Maryland and Virginia, and use national figures only as a fallback.

| Layer | Source | Join key | Watch out for |
| :---- | :---- | :---- | :---- |
| Job projections and entry requirements | [BLS Employment Projections](https://www.bls.gov/emp/tables/occupations-most-job-growth.htm) Tables 1.2, 1.4, 1.10 (2025–35) | 6-digit SOC | Keep only "Line item" rows to avoid double counting |
| Wages | [BLS OEWS](https://www.bls.gov/oes/tables.htm) May 2025 (national, state, metro) | SOC \+ area | Excludes self-employed; local cells can be suppressed |
| AI exposure | [BLS AI exposure categories](https://www.bls.gov/emp/publications/ai-exposure-categories.htm) | SOC | Relative ranking, not a forecast |
| Tasks, interests, work values, Job Zones | [O\*NET 31.0](https://www.onetcenter.org/database.html) | 8-digit O\*NET-SOC | CC BY 4.0 attribution required |
| Skills, knowledge, related occupations, schedule (card factors 5–7) | [O\*NET 31.0](https://www.onetcenter.org/database.html) Skills, Knowledge, Related Occupations and Work Context files | 8-digit O\*NET-SOC | Confirm the Work Context fields for weekly hours and schedule regularity at download; limit related occupations to the beta roster |
| College cost and outcomes | [College Scorecard](https://collegescorecard.ed.gov/data/) \+ NCES CIP–SOC crosswalk | UNITID \+ 4-digit CIP | "PrivacySuppressed" becomes null; Title IV schools only |
| Apprenticeships and training | DOL RAPIDS, TrainingProviderResults.gov | Title or sponsor to SOC | Needs title-to-SOC matching |
| ZIP to metro | [HUD-USPS ZIP–CBSA crosswalk](https://www.huduser.gov/portal/datasets/usps_crosswalk.html) | ZIP to CBSA | Split ZIPs ranked by `tot_ratio` |
| Completion and long-run earnings | College Scorecard, [Census PSEO](https://lehd.ces.census.gov/data/) | UNITID \+ CIP | PSEO covers only some states and schools |
| Cost of living | [BEA Regional Price Parities](https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area), [HUD Fair Market Rents](https://www.huduser.gov/portal/datasets/fmr.html) | CBSA, state | FMR is a benchmark, not average rent |
| Admissions and aid | College Scorecard, [studentaid.gov](https://studentaid.gov/), state programs | UNITID, state | State programs curated by hand for DC, Maryland and Virginia |
| Licensing | [CareerOneStop](https://www.careeronestop.org/) | O\*NET-SOC \+ state | Show "varies by state" as published |
| Job quality | [BLS SOII](https://www.bls.gov/iif/), [BLS NCS](https://www.bls.gov/ncs/) | Broad occupation group | Group-level only |
| Local demand | [Projections Central](https://projectionscentral.org/) | SOC \+ state | Label each state's projection years |
| Self-employed earnings | [Census ACS PUMS](https://www.census.gov/programs-surveys/acs/microdata.html) | Census occupation code | Use survey weights; suppress small cells |
| Task-level AI usage | [Anthropic Economic Index](https://www.anthropic.com/economic-index) | O\*NET task | Secondary check only; confirm license |

Three join rules go into the ETL script:

1. Keep the 8-digit O\*NET code for tasks and interests, and roll up to the 6-digit SOC for wages and projections. Label the card when it shows parent-group wages.  
2. Cut CIP codes to 4 digits for Field of Study joins, and filter out roles needing 5+ years of prior experience so students are not routed into management tracks.  
3. For ZIPs that span several metros, pick the one with the highest `tot_ratio`.

## Beta Dataset

The beta covers 25–30 occupations, 15–20 local or flagship schools and DOL RAPIDS sponsors across DC, Maryland and Virginia. A Top 100 list is built from BLS Table 1.2. Choose the beta roster by stratified quotas rather than job growth alone, since growth rankings favor large, low-wage roles.

| Stratum | Minimum | Example roles (confirm entry education in Table 1.2) |
| :---- | :---- | :---- |
| No formal credential or high school diploma | 5 | Construction laborers, stockers and order fillers, industrial machinery mechanics |
| Postsecondary non-degree award or associate degree | 5 | Medical assistants, heavy truck drivers |
| Bachelor's degree | 5 | Accountants, registered nurses, software developers |
| Master's degree or higher | 2 | Nurse practitioners |
| Registered apprenticeship (overlaps other strata) | 3 | Electricians, industrial machinery mechanics |
| Wage spread | 5 below the \$50,980 median, 5 above \$100,000 | Fast food workers ($31,200),nursepractitioners($132,300) |
| AI exposure spread | 3 Low or Moderate, 3 High or Very high | Software developers (Very high) |

Within each stratum, rank by annual openings, and keep at least one small, fast-growing role. The blueprint lists the top 30 occupations by projected growth as a starting seed.

## Calculation Rules

Every figure is computed in backend code as a documented function with unit tests.

- **Net price:** look up by the student's family income tier (five brackets). Show net price at or below zero as "Net grant surplus / zero net tuition", never as a negative ROI. Label it an average for aided students, not a personal quote, and link to the school's net price calculator.  
- **Completion-adjusted premium:** (program earnings − median earnings with a high school diploma) × completion rate. Show the adjusted and unadjusted figures together.  
- **Real wage:** nominal wage × 100 / Regional Price Parity, falling back from metro to state to national, with a `wage_geography_scope` label.  
- **Rent burden:** one-bedroom Fair Market Rent as a share of monthly 10th/25th percentile pay, against the common 30% benchmark.  
- **Earnings horizons:** 1-, 5-, 6- and 10-year earnings each labeled, never blended.  
- **Missing data:** "PrivacySuppressed" and blank cells become null, never 0, with a visible badge and a fallback figure.  
- **Risk badges:** flag schools whose default or repayment rate crosses a threshold the team sets.

## AI Impact Signals

No invented "AI resilience score". Each card shows three grounded signals:

1. **BLS exposure tier beside 10-year growth.** For example, software developers are rated Very high exposure yet are projected to add 174,700 jobs (+10.2%) through 2035\.  
2. **Early-career caution flag.** Shown when the tier is High or Very high and entry education is a bachelor's or higher, driven by a reviewed lookup table. It cites Stanford's *Canaries in the Coal Mine?* payroll research as early, descriptive evidence of tighter junior hiring.  
3. **Task split.** Each O\*NET task is labeled Automated, Augmented or Human-Centric. Labels are computed once at build time, stored with a `classification_version` and cross-checked against the Anthropic Economic Index, so every student sees the same answer.

Every card also states that BLS tiers are relative rankings, not forecasts, and do not separate automation from augmentation.

## Privacy, Bias and Compliance

**Privacy**

- No accounts, names, emails, GPAs, demographics or persistent cookies; selections live only in browser memory.  
- Paid Tier Gemini for the beta; Vertex AI Zero Data Retention before a school pilot.  
- Check COPPA, FERPA and DC, Maryland and Virginia student-privacy laws with school or legal counsel.

**Anti-bias**

- Never pass race, gender or household income into Stage 1 matching. Income is used only in the net price lookup after matching.  
- At least one of the three cards is an Adjacent Discovery role, apprenticeship or two-year path.

**Shown on every results screen**

- Data vintage and attribution banner (BLS OEWS May 2025, BLS Projections 2025–35, O\*NET 31.0 under CC BY 4.0, College Scorecard)  
- Missing-data badges such as "Statewide wage proxy shown"  
- A note that earnings are historical averages, not guarantees

**Accessibility:** WCAG 2.2 Level AA, tested on a phone over a slow connection.

## Validation and Pass Criteria

- **Data accuracy:** every displayed value traces to its source file, row and vintage. Automated tests plus a manual check of at least 20 random card values.  
- **Counselor review:** at least two school counselors review the cards and printable guide.  
- **Student usability test:** a small group completes set tasks. Confirm consent and review requirements with the instructor and school first.  
- **Readability:** summaries at about an 8th–9th grade level, numbers exact.  
- **Bias audit:** paired prompts that differ only in ZIP, income, names, dialect or gendered phrasing must return the same tier of careers.  
- **Edge cases:** correct fallback on off-topic and contradictory prompts.  
- **Success measures:** aggregate counters and an optional anonymous feedback prompt, with no identifiers.

Proposed pass criteria: zero unsourced numbers, zero fabricated records, correct fallback on every test prompt and counselor sign-off on the guide.

## Team and Roles

| Person | Focus | Milestones |
| :---- | :---- | :---- |
| Kamya | JSON dataset, built with Gemini | 1, 6 |
| Maylene | App build with Claude Code | 2–7 |
| Sean | App build with Claude Code | 2–7 |
| Sophie | App build with Claude Code | 2–7 |
| Avis | Report and demo | 8 |
| Jack | Report and demo | 8 |

## Milestones

All eight lead to the Class 9 demonstration, in this order. Owners can be reassigned.

1. **Build the JSON dataset** (Kamya): build the Top 100 and beta roster with Gemini from the federal files, and export the three JSON files with a source and vintage for every value.  
2. **Build the lookup and ROI engine** (Maylene, Sean, Sophie): data adapters, ZIP-to-metro matching, wage fallback chain, education filters, net price math.  
3. **Wire privacy-safe Gemini** (Maylene, Sean, Sophie): server-side calls on a Paid Tier key, schema validation, off-topic and conflict routing.  
4. **Build the three-card dashboard and guardrails** (Maylene, Sean, Sophie): glance and expand layers with the Beta core factors (see Career Card Layers), AI impact display, banners and badges, printable guide with fixed reflection and conversation prompts.  
5. **Run adversarial, edge-case and bias tests** (Maylene, Sean, Sophie).  
6. **Extend the dataset and ROI engine** (Kamya for data; Maylene, Sean, Sophie for code): add the Addendum A layers and the Beta stretch card factors (related careers, schedule and balance, skills, time to first paycheck), rebuild the roster with quotas, add completion, cost-of-living, rent and horizon math with tests.  
7. **Harden validation, accessibility and operations** (Maylene, Sean, Sophie): accuracy audit, counselor review, usability test, fallback browse mode, throttling, accessibility review.  
8. **Write the report and prepare the demo** (Avis, Jack, with input from the build team).

## Open Questions

- [ ] What is the Class 9 date, and what are the target dates for each milestone?  
- [ ] How will we check that every number in Kamya's Gemini-built dataset matches its federal source row, so no values are invented?  
- [ ] Who owns testing (milestones 5 and 7\) now that Kamya is on the dataset?  
- [ ] Which 15–20 DC, Maryland and Virginia schools go into the beta, and what should the app show for a ZIP code outside the region?  
- [ ] How long is the values quiz, and how are its questions worded?  
- [x] ~~Which data will cover work-life balance and travel?~~ Decided: schedule and balance uses O\*NET Work Context (weekly hours, schedule regularity); travel is dropped.  
- [ ] Should O\*NET related occupations and the Work Context schedule fields go into Kamya's milestone 1 scope, so "Where it leads" and "Schedule and balance" can move from Beta stretch to Beta core?  
- [ ] Which O\*NET Work Context fields best represent weekly hours and schedule regularity? Confirm at download.  
- [ ] Who builds and reviews the lookup table mapping education or training level to time to first paycheck?  
- [ ] When "Where it leads" points to a role outside the beta roster, do we link out to O\*NET's page or hide it?  
- [ ] How are the guide's strengths-and-growth and family prompts worded? Include them in the counselor review.  
- [ ] Should the Top 100 rank by total employment or by job growth?  
- [ ] What default or repayment threshold triggers a risk badge?  
- [ ] Which front-end framework and hosting will we use?  
- [ ] Which counselors will review, and does student testing need consent or review approval?  
- [ ] Confirm field names, release dates and licenses (Scorecard columns, PSEO, Anthropic Economic Index) at download.  
- [ ] Check the blueprint's figures against the original sources before quoting them in the demo, since it was drafted from AI-assisted research.

## Sources

- [Gemini research thread](https://gemini.google.com/share/d/1HcbumroEwxxWofxpOccU_KQbIgdvRyGk?usp=sharing)  
- PathwayAI Build Team Data Blueprint (with Addendum A)  
- PathwayAI Website Development Requirements  
- Assignment \#2(A): AI Approach Scoping Outline  
- Data source links are in the Data Sources table above.