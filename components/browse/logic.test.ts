import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSocs } from "@/app/results/parse";
import { repositoryFromRaw } from "@/lib/data/repository";
import { buildBrowseData } from "./data";
import {
  filterCareers,
  NO_FILTERS,
  plainJobZoneLabel,
  resultsHref,
  RIASEC_LETTERS,
  toggleSelected,
} from "./logic";

const repo = repositoryFromRaw(
  JSON.parse(readFileSync("data/occupations.json", "utf8")),
  JSON.parse(readFileSync("data/institutions.json", "utf8")),
);
const data = buildBrowseData(repo);

describe("buildBrowseData", () => {
  it("lists all 30 careers, sorted by title", () => {
    expect(data.careers).toHaveLength(30);
    const titles = data.careers.map((c) => c.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it("offers only filter values that have careers", () => {
    for (const e of data.educationOptions) expect(filterCareers(data.careers, { ...NO_FILTERS, education: e }).length).toBeGreaterThan(0);
    for (const z of data.jobZoneOptions) expect(filterCareers(data.careers, { ...NO_FILTERS, jobZone: z.value }).length).toBeGreaterThan(0);
  });

  it("has a vintage and URL for every source shown", () => {
    expect(data.sources.length).toBeGreaterThan(0);
    for (const s of data.sources) {
      expect(s.data_vintage).toBeTruthy();
      expect(s.source_url).toBeTruthy();
    }
  });

  it("sends no wage or student-facing cost fields to the client", () => {
    expect(Object.keys(data.careers[0]).sort()).toEqual(
      ["description", "entry_education", "job_zone", "job_zone_label", "riasec_code", "soc_code", "title"].sort(),
    );
  });
});

describe("filterCareers", () => {
  it("returns everything with no filters", () => {
    expect(filterCareers(data.careers, NO_FILTERS)).toHaveLength(30);
  });

  it("matches a RIASEC letter anywhere in the code", () => {
    for (const riasec of RIASEC_LETTERS) {
      const expected = data.careers.filter((c) => c.riasec_code.includes(riasec));
      expect(filterCareers(data.careers, { ...NO_FILTERS, riasec })).toEqual(expected);
    }
  });

  it("combines filters with AND", () => {
    const f = { education: "Bachelor's degree", jobZone: 4, riasec: "I" as const };
    const out = filterCareers(data.careers, f);
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(c.entry_education).toBe(f.education);
      expect(c.job_zone).toBe(4);
      expect(c.riasec_code).toContain("I");
    }
  });
});

describe("selection", () => {
  it("adds, removes and stops at three", () => {
    let s = toggleSelected([], "11-1111");
    s = toggleSelected(s, "22-2222");
    s = toggleSelected(s, "33-3333");
    expect(toggleSelected(s, "44-4444")).toEqual(s);
    expect(toggleSelected(s, "22-2222")).toEqual(["11-1111", "33-3333"]);
  });

  it("links to results only with exactly three, in a form /results accepts", () => {
    const three = data.careers.slice(0, 3).map((c) => c.soc_code);
    expect(resultsHref(three.slice(0, 2))).toBeNull();
    const href = resultsHref(three)!;
    expect(parseSocs(new URL(href, "http://x").searchParams.get("socs") ?? "")).toEqual({ ok: true, socs: three });
  });
});

describe("plainJobZoneLabel", () => {
  it("removes the prefix and shouting capitals", () => {
    expect(plainJobZoneLabel("Job Zone 1-2: Very Little to Some Preparation Needed")).toBe(
      "Very little to some preparation needed",
    );
  });
});
