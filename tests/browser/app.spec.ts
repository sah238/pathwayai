/**
 * Browser checks at phone and desktop width. Claude is never called:
 * /api/recommend is mocked, or (for the failure path) reaches a server with no
 * key. Requests to any other host are blocked.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";
import institutions from "../../data/institutions.json";
import occupations from "../../data/occupations.json";
import conflictFixture from "../../lib/match/fixtures/student_05.json";
import studentFixture from "../../lib/match/fixtures/student_01.json";
import { repositoryFromRaw } from "../../lib/data/repository";
import type { ExtractedFilters } from "../../lib/extract/schema";
import { NUDGE_MESSAGE, selectCards } from "../../lib/match/selectCards";
import type { QuizResponses } from "../../lib/quiz/responses";

const ZIP = "20910";
const CHANGED_ZIP = "22201";
const INCOME_LABEL = "$30,001–48,000";
const ANSWER_MARKER = "ZQBROWSERMARKER";
const repo = repositoryFromRaw(occupations, institutions);

function recommendBody(fixture: { quiz_responses: unknown; filters: unknown }) {
  const result = selectCards(
    fixture.filters as ExtractedFilters,
    fixture.quiz_responses as QuizResponses,
    repo.listOccupations(),
  );
  if (result.kind !== "cards") throw new Error("expected cards");
  return {
    kind: "cards",
    mode: result.mode,
    cards: result.cards.map((c) => ({
      soc: c.soc,
      slot: c.slot,
      dream_job_label: c.dream_job_label,
      matched_values: [],
      matched_interests: [],
      avoid_hits: c.avoid_hits,
      summary: {
        kind: "tasks",
        soc_code: c.soc,
        tasks: repo.getOccupation(c.soc)!.core_tasks.slice(0, 3),
        source: repo.occupationSource("core_tasks"),
      },
    })),
  };
}

async function blockOtherHosts(page: Page, baseURL: string) {
  await page.route("**/*", (route) =>
    route.request().url().startsWith(baseURL) ? route.continue() : route.abort(),
  );
}

const mockRecommend = (page: Page, body: unknown) =>
  page.route("**/api/recommend", (route) => route.fulfill({ json: body }));

const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true }).click();

/** Answers all 11 questions and presses Finish. `onScreen` runs on every question. */
async function walkQuiz(page: Page, zip: string, onScreen: (name: string) => Promise<void> = async () => {}) {
  await page.goto("/quiz");
  await onScreen("/quiz intro");
  await page.getByRole("button", { name: "Start the quiz" }).click();

  await page.locator("#q1-job").fill("Electrician");
  await page.locator("#q1-because").fill(`${ANSWER_MARKER} because`);
  await onScreen("/quiz Q1");
  await next(page);

  await page.getByRole("checkbox").first().check();
  await onScreen("/quiz Q2");
  await next(page);

  await page.locator("#q3").fill(`${ANSWER_MARKER} help`);
  await onScreen("/quiz Q3");
  await next(page);

  for (const i of [0, 1, 2]) await page.locator("button[aria-pressed]").nth(i).click();
  await onScreen("/quiz Q4");
  await next(page);

  for (const group of await page.getByRole("radiogroup").all()) await group.getByRole("radio").first().check();
  await onScreen("/quiz Q5");
  await next(page);

  await onScreen("/quiz Q6");
  await next(page);

  await page.getByRole("radio").first().check();
  await onScreen("/quiz Q7");
  await next(page);

  for (const group of await page.getByRole("radiogroup").all()) await group.getByRole("radio").first().check();
  await onScreen("/quiz Q8");
  await next(page);

  await page.getByRole("checkbox", { name: "None of these" }).check();
  await onScreen("/quiz Q9");
  await next(page);

  await page.getByRole("radio", { name: "About 1–2 years" }).check();
  await onScreen("/quiz Q10");
  await next(page);

  await page.locator("#q11").fill(zip);
  await onScreen("/quiz Q11");

  // Follow-up screens depend on the answers; take the first option on each.
  const finishButton = page.getByRole("button", { name: "Finish", exact: true });
  for (let i = 1; !(await finishButton.isVisible()); i++) {
    if (i > 4) throw new Error("Too many follow-up screens");
    await next(page);
    await page.getByRole("radio").first().check();
    await onScreen(`/quiz follow-up ${i}`);
  }
  await finishButton.click();
}

async function browserState(page: Page) {
  const inPage = await page.evaluate(async () => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
    cookie: document.cookie,
    databases: JSON.stringify(await indexedDB.databases()),
    caches: JSON.stringify(await caches.keys()),
  }));
  return { ...inPage, cookies: JSON.stringify(await page.context().cookies()) };
}

function expectClean(label: string, value: string) {
  for (const secret of [ZIP, CHANGED_ZIP, INCOME_LABEL, ANSWER_MARKER]) {
    expect(value, `${label} contains ${secret}`).not.toContain(secret);
  }
}

test.describe("check 2: routing in the browser", () => {
  test.beforeEach(async ({ page, baseURL }) => blockOtherHosts(page, baseURL!));

  test("pizza shows the nudge", async ({ page }) => {
    await mockRecommend(page, { kind: "nudge", message: NUDGE_MESSAGE });
    await walkQuiz(page, "");
    await expect(page.getByRole("heading", { name: "Let's talk about careers" })).toBeVisible();
    await expect(page.getByText(NUDGE_MESSAGE)).toBeVisible();
  });

  test("a conflict shows the closest-match and short-training labels", async ({ page }) => {
    await mockRecommend(page, recommendBody(conflictFixture));
    await walkQuiz(page, "");
    await expect(page).toHaveURL(/\/results\?socs=/);
    await expect(page.getByText("Closest match to what you described", { exact: true })).toBeVisible();
    await expect(page.getByText("A shorter training path")).toHaveCount(2);
    await expect(page.getByText("Closest career in our list to Surgeon")).toBeVisible();
    await expect(page.getByText("You said you'd rather avoid: Blood or medical procedures.")).toBeVisible();
  });

  test("an API failure leads to /browse, and the server logs no answers", async ({ page }) => {
    // Not mocked: the real route answers 503 because the test server has no key.
    const response = page.waitForResponse("**/api/recommend");
    await walkQuiz(page, ZIP);
    expect((await response).status()).toBe(503);
    await expect(page.getByRole("heading", { name: /match careers right now/ })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Browse careers" }).click();
    await expect(page).toHaveURL(/\/browse$/);
    expectClean("server log", readFileSync("test-results/server.log", "utf8"));
  });
});

test.describe("check 4: privacy in the browser", () => {
  test("ZIP, income and answers stay out of URLs, storage, cookies and logs", async ({ page, baseURL }) => {
    const requests: Request[] = [];
    const consoleLines: string[] = [];
    const urls: string[] = [];
    page.on("request", (r) => requests.push(r));
    page.on("console", (m) => consoleLines.push(m.text()));
    page.on("pageerror", (e) => consoleLines.push(String(e)));
    page.on("framenavigated", (f) => urls.push(f.url()));
    await blockOtherHosts(page, baseURL!);
    await mockRecommend(page, recommendBody(studentFixture));

    await walkQuiz(page, ZIP);
    await expect(page).toHaveURL(/\/results\?socs=\d{2}-\d{4},\d{2}-\d{4},\d{2}-\d{4}$/);

    const zipBox = page.getByLabel(/ZIP code/);
    await expect(zipBox).toHaveValue(ZIP);
    await page.getByLabel(/Family income/).selectOption({ label: INCOME_LABEL });
    await zipBox.fill(CHANGED_ZIP);
    await page.getByRole("button", { name: /What would it be like/ }).first().click();

    for (const [name, value] of Object.entries(await browserState(page))) expectClean(`browser ${name}`, value);
    for (const url of [...urls, ...requests.map((r) => r.url())]) expectClean("URL", url);
    expectClean("console", consoleLines.join("\n"));
    expectClean("server log", readFileSync("test-results/server.log", "utf8"));

    const withBody = requests.filter((r) => r.postData());
    expect(withBody.map((r) => new URL(r.url()).pathname)).toEqual(["/api/recommend"]);
    const sent = JSON.parse(withBody[0].postData()!);
    expect(sent.q11_zip_code).toBeNull();
    expect(withBody[0].postData()).not.toContain(ZIP);
    expect(withBody[0].postData()).not.toContain(INCOME_LABEL);
    for (const r of requests) {
      const headers = JSON.stringify(await r.allHeaders());
      expectClean("request headers", headers);
    }
  });
});

interface Finding {
  width: string;
  screen: string;
  rule: string;
  impact: string | null;
  help: string;
  url: string;
  nodes: string[];
}

test.describe("check 5: accessibility", () => {
  test("axe finds no WCAG A or AA issues", async ({ page, baseURL }, info) => {
    const findings: Finding[] = [];
    const scanned: string[] = [];
    const scan = async (screen: string) => {
      scanned.push(screen);
      // Measure settled colors, not a hover state or a button partway through a transition.
      await page.mouse.move(0, 0);
      await page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      for (const v of result.violations) {
        findings.push({
          width: info.project.name,
          screen,
          rule: v.id,
          impact: v.impact ?? null,
          help: v.help,
          url: v.helpUrl,
          nodes: v.nodes.map((n) => n.target.join(" ")),
        });
      }
    };

    await blockOtherHosts(page, baseURL!);
    await mockRecommend(page, recommendBody(studentFixture));

    await page.goto("/");
    await scan("/");
    await walkQuiz(page, ZIP, scan);
    await expect(page).toHaveURL(/\/results\?socs=/);
    await expect(page.locator("article")).toHaveCount(3);
    await scan("/results glance");
    await page.getByRole("button", { name: /What would it be like/ }).first().click();
    await scan("/results expanded");
    await page.goto("/browse");
    await expect(page.getByRole("form", { name: "Filter careers" })).toBeVisible();
    await scan("/browse");

    mkdirSync("test-results", { recursive: true });
    writeFileSync(
      `test-results/a11y-${info.project.name}.json`,
      `${JSON.stringify({ scanned, findings }, null, 2)}\n`,
    );
    expect(scanned.length).toBeGreaterThanOrEqual(16);
    expect(findings).toEqual([]);
  });
});
