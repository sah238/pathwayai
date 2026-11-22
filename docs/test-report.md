# PathwayAI end-to-end test report

**Date:** 2026-11-22 · **Branch:** `s10-tests` · **Base:** `main` at `8a5529a`

**Live Claude API check: Not yet run.** Every result below uses saved fixtures and a mocked Claude. No Claude API call was made.

## Summary

| # | Check | Result | Failures |
|---|---|---|---|
| 1 | Numbers trace to a sourced repository value | **FAIL** | F4: four values have no `data_vintage`. All other number checks pass. |
| 1a | Nothing shows 0 where the data is null | PASS | |
| 2 | Routing: nudge, conflict labels, API failure to `/browse` | PASS | |
| 3 | Bias: ZIP and income do not change the three careers | PASS | |
| 4 | Privacy: URLs, storage, cookies, logs and structured Claude requests | PASS | |
| 4a | Privacy: personal details typed into free-text answers stay out of Claude | **FAIL** | F3 |
| 5 | Accessibility: automated axe scan, phone and desktop | PASS | No issues found |
| 6 | Labels: draft wording keeps a visible review label | **FAIL** | F1 |
| 6a | Avoid-list warning reaches the card (`student_05`) | **FAIL** | F2 |
| L | Live Claude API, 12 cases | **Not yet run** | Commands below |

| Command | Result |
|---|---|
| `npm test` | Passed: 25 files, 660 tests passed, 11 expected failures (one per confirmed bug assertion) |
| `npm run test:e2e` | Passed: 10 of 10 browser tests (5 at each width) |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |

`npm test` is green because confirmed bugs use `it.fails`. When a fix lands on `s10-fixes`, its `it.fails` test turns red until `.fails` is removed. A green run therefore does not mean F1 to F4 are fixed.

## Failures

No app code was changed in this PR. Fixes belong on `s10-fixes`.

### F1. Draft wording shown without a visible review label

These strings are marked as drafts in code, but the student sees no "Draft — pending counselor review" label.

| Wording | Shown at | Marked as draft at |
|---|---|---|
| Card slot labels | `components/cards/CareerCard.tsx:214` | `components/cards/personalize.ts:15` |
| "Why it fits you" text | `components/cards/CareerCard.tsx:256`, `:266` | `components/cards/personalize.ts:6` |
| Closest-match heading and note | `components/cards/CareerCard.tsx:225`, `:226` | `lib/match/selectCards.ts:63` |
| Off-topic nudge | `components/quiz/FinishScreen.tsx:50` | `lib/match/selectCards.ts:50` |
| API-failure message | `components/quiz/FinishScreen.tsx:64`, `:68` | `components/quiz/FinishScreen.tsx:6` |
| Finish-screen wait message | `components/quiz/FinishScreen.tsx:37`, `:40` | `components/quiz/FinishScreen.tsx:6` |
| Quiz question wording | `components/quiz/screens.tsx:417` | `lib/quiz/responses.ts:7` |

Test: `tests/e2e/labels.test.ts`

### F2. `student_05`'s avoid-list warning is dropped before the card

`student_05` selected "Blood or medical procedures" to avoid, and their first card is Nurse Practitioners. Selection records the hit in `avoid_hits`, as designed for a conflict card. The API response does not include it, so the card gives no warning.

- Dropped at: `app/api/recommend/handler.ts:104`
- Missing from the response type: `app/api/recommend/types.ts:27`
- Nothing to display it: `components/cards/CareerCard.tsx:203`
- Test: `tests/e2e/labels.test.ts`

### F3. Personal details typed into a free-text answer reach Claude

ZIP, income and demographic **fields** never reach Claude. If a student **types** them into an answer, such as "My ZIP is 20910, my family makes $40,000 a year, and I am a Latina girl", the sentence is sent unchanged in the Stage 1 user message. Stage 2 is not affected.

- Sent at: `lib/extract/prompt.ts:28`
- Test: `tests/e2e/privacy.test.ts`
- The team needs to decide how to handle this, for example by redacting patterns, warning students near the text box, or both. Pattern matching cannot catch every phrasing.

### F4. Four displayed values have no `data_vintage`

These apprenticeship program lengths have a source and URL but no vintage, which breaks project rule 7.

| Record | Displayed value | Provenance in `data/institutions.json` |
|---|---|---|
| `APPR-IBEW26` | 5 years | line 6316 |
| `APPR-SM602` | 5 years | line 6396 |
| `APPR-SMART100` | 5 years | line 6478 |
| `APPR-MACTC` | 4 years | line 6557 |

Displayed at `components/cards/CareerCard.tsx:114`. Test: `tests/e2e/numbers.test.ts`. The correct vintages must come from the original sources (dataset owner: Kamya).

## What each check covered

**Cases:** `student_01` to `student_10`, `off_topic_pizza` and `conflict_surgeon`, from `lib/match/fixtures/`.

### 1. Numbers (`tests/e2e/numbers.test.ts`, `tests/e2e/number-audit.ts`)

- Each of the 11 card-producing cases was rendered in 30 views: 5 ZIP states (none, DC, MD, VA, out of region) by 6 income states (none plus 5 tiers), with the Expand layer open.
- Every number was matched to a ledger built from repository records, not from the card view-model.
- The printed guide was checked in the same 30 views.
- The whole roster was also checked for null handling: null net prices and employment show badges, and `$0` never appears.

### 2. Routing (`tests/e2e/routing.test.ts`, `tests/browser/app.spec.ts`)

- Pizza shows the nudge and makes no Stage 2 call.
- `student_05` and `conflict_surgeon` show "Closest match" plus two "A shorter training path" cards. Surgeon is not in the dataset, so "The real path" is correctly not used.
- A missing key, Stage 1 error, network error and malformed response all show the error screen. The student reaches `/browse` by pressing its "Browse careers" button; the redirect is not automatic.

### 3. Bias (`tests/e2e/bias.test.ts`)

- All 12 cases were rerun with 4 ZIPs and 5 income tiers. Careers and slots did not change.
- Claude requests were byte-identical across ZIPs.
- `/api/recommend` refuses an income field with a 400 before calling Claude.
- Limit: the mock returns the same Stage 1 output each time. The identical requests show the app gives Claude no ZIP signal, but this does not measure variation in live model output.

### 4. Privacy (`tests/e2e/privacy.test.ts`, `tests/browser/app.spec.ts`)

- Answers appear only in the Stage 1 user message. The Stage 2 request exactly equals the three career records.
- ZIP, income, race, ethnicity, gender, sex, age, name, email and GPA fields are refused or kept out of Claude requests.
- In a real browser, marker values for ZIP, income and answers were absent from URLs, request headers, localStorage, sessionStorage, IndexedDB, Cache Storage, cookies, the console and the server log.
- `npm test` removes the API key and blocks every non-local network request (`tests/setup/block-network.ts`).
- Note: the results URL contains the three career codes by design. They are not answers, but they are derived from them.

### 5. Accessibility (`tests/browser/app.spec.ts`)

axe checked WCAG 2.0, 2.1 and 2.2 A and AA rules at 375 px and 1280 px on 17 screens: `/`, the `/quiz` intro, all 11 questions, a follow-up, `/results` (glance and expanded) and `/browse`.

**Issues found: none.** Scans wait for transitions to finish, because the Next button briefly reports low contrast while it animates from disabled to enabled.

Automated scans catch only part of WCAG. Keyboard use, screen-reader use and a slow phone connection still need manual testing.

### 6. Labels (`tests/e2e/labels.test.ts`)

Labels are present on first-step wording, the early-career flag and the printed guide. All other draft wording is listed under F1.

## Live Claude check: Not yet run

This sends the 12 saved cases through `/api/recommend`, using up to 24 Haiku requests, and prints a pass count. It needs an API key and should be run on a machine where one is allowed.

**Terminal 1.** Enter the key for this terminal session only:

```powershell
$k = Read-Host "Anthropic API key" -AsSecureString
```

```powershell
$env:ANTHROPIC_API_KEY = [System.Net.NetworkCredential]::new("", $k).Password
```

```powershell
npx next dev -p 3002
```

**Terminal 2.** Once the server is ready:

```powershell
npx tsx scripts/run-recommend-live.ts http://localhost:3002
```

The last line reads `N/12 passed`. Stop the server with Ctrl+C, then clear the key in Terminal 1:

```powershell
Remove-Item Env:ANTHROPIC_API_KEY
```

| Live result | Value |
|---|---|
| Status | **Not yet run** |
| Pass count | Not yet run |
| Run by / date | Not yet run |

## How to rerun

```powershell
npm test
```

```powershell
npm run test:e2e
```

`test:e2e` builds the app and uses the installed Edge browser. To use Chrome instead:

```powershell
$env:E2E_BROWSER_CHANNEL = "chrome"; npm run test:e2e
```
