import { describe, expect, it } from "vitest";
import { getRepository } from "@/lib/data/server";
import { INCOME_TIERS } from "@/lib/calc";
import { parseSocs } from "./parse";
import { selectNetPrice, selectWages, sortPrograms, sourcesOnScreen, zipStatus } from "./select";
import { buildCardViewModel, NET_PRICE_KEYS, type CardViewModel } from "./view-model";

const repo = getRepository();
const card = (soc: string): CardViewModel => {
  const c = buildCardViewModel(repo, soc);
  if (!c) throw new Error(`no card for ${soc}`);
  return c;
};
const DEMO = ["47-2111", "29-1141", "15-1252"];

describe("parseSocs", () => {
  it("accepts three distinct SOC codes", () => {
    expect(parseSocs("47-2111,29-1141,15-1252")).toEqual({ ok: true, socs: DEMO });
  });
  it("rejects the wrong count, bad codes and duplicates", () => {
    expect(parseSocs(undefined).ok).toBe(false);
    expect(parseSocs("47-2111,29-1141").ok).toBe(false);
    expect(parseSocs("47-2111,29-1141,abc").ok).toBe(false);
    expect(parseSocs("47-2111,47-2111,15-1252").ok).toBe(false);
  });
});

describe("buildCardViewModel", () => {
  it("returns null for an unknown SOC", () => {
    expect(buildCardViewModel(repo, "99-9999")).toBeNull();
  });

  it("factor 1: first three core tasks, with the O*NET source", () => {
    const occ = repo.getOccupation("47-2111")!;
    const c = card("47-2111");
    expect(c.tasks.value).toEqual(occ.core_tasks.slice(0, 3));
    expect(c.tasks.source?.source).toMatch(/O\*NET/);
  });

  it("factor 2: top two work values as Q4 labels, or a not-rated badge", () => {
    const rated = card("47-2111").rewards;
    expect(rated.status).toBe("rated");
    if (rated.status === "rated") {
      // high_points: independence, support, …
      expect(rated.labels).toEqual(["Decide for myself how to do things", "Have a boss and company that support me"]);
    }
    const unrated = card("15-1252").rewards;
    expect(unrated).toMatchObject({ status: "not_rated", badge: "Not rated by O*NET" });
  });
});

describe("factor 3: wages by ZIP", () => {
  it("defaults to national wages with no badge before any ZIP", () => {
    const w = selectWages(card("47-2111"), zipStatus(""));
    expect(w.scope).toBe("national");
    expect(w.badge).toBeNull();
    expect(w.source?.source_url).toBeTruthy();
  });

  it("ZIP 10001 (outside the region) shows national wages with the national-data badge", () => {
    const occ = repo.getOccupation("29-1141")!;
    const w = selectWages(card("29-1141"), zipStatus("10001"));
    expect(w.scope).toBe("national");
    expect(w.badge).toBe("National wages shown");
    expect(w.percentiles.median).toBe(occ.national_wages_2025.median_50th);
  });

  it("a VA ZIP shows the Virginia row, traced to state_wages_2025", () => {
    const occ = repo.getOccupation("15-1252")!;
    const va = occ.state_wages_2025.VA!;
    const w = selectWages(card("15-1252"), zipStatus("22201"));
    expect(w).toMatchObject({ scope: "state", requested_state: "VA", badge: null });
    expect(w.percentiles).toEqual({
      p10: va.wage_10th,
      p25: va.wage_25th,
      median: va.median_wage,
      p75: va.wage_75th,
      p90: va.wage_90th,
    });
    expect(w.source).toEqual(repo.occupationSource("state_wages_2025"));
  });

  it("flags a small-sample percentile only for the state it applies to", () => {
    const c = card("29-1131");
    expect(c.wages.DC.small_sample).toEqual(["p90"]);
    expect(c.wages.DC.small_sample_source).not.toBeNull();
    expect(c.wages.VA.small_sample).toEqual([]);
    expect(c.wages.national.small_sample).toEqual([]);
  });
});

describe("factor 4: path and net price", () => {
  it("49-9041 has no local program and shows the national route", () => {
    const c = card("49-9041");
    expect(c.path.programs).toEqual([]);
    expect(c.path.national_route.value.length).toBeGreaterThan(0);
    expect(c.path.national_route.source).not.toBeNull();
  });

  it("no tier shows the overall average net price for every school", () => {
    for (const soc of DEMO) {
      for (const p of card(soc).path.programs) {
        const r = selectNetPrice(p, null);
        const inst = repo.getInstitution(p.record_id)!.institution;
        if (p.is_apprenticeship) {
          expect(r.status).toBe("not_applicable");
        } else if (r.status === "overall_average") {
          expect(r.amount).toBe(inst.cost_and_net_price.avg_net_price);
        } else {
          expect(["missing", "net_grant_surplus"]).toContain(r.status);
        }
      }
    }
  });

  it("a tier picks that tier's field from the same school", () => {
    const p = card("29-1141").path.programs[0];
    const inst = repo.getInstitution(p.record_id)!.institution;
    const r = selectNetPrice(p, 2);
    expect(r.record_id).toBe(p.record_id);
    expect(r.tier).toBe(2);
    if (r.status === "amount") expect(r.amount).toBe(inst.cost_and_net_price[INCOME_TIERS[2].field]);
  });

  it("electricians list the IBEW apprenticeship as not applicable, with its length and source", () => {
    const appr = card("47-2111").path.programs.find((p) => p.is_apprenticeship)!;
    expect(card("47-2111").path.apprenticeship_option).toBe(true);
    for (const k of NET_PRICE_KEYS) expect(appr.net_price[k].status).toBe("not_applicable");
    expect(appr.program_length_years?.value).toBe(5);
    expect(appr.program_length_years?.source).not.toBeNull();
  });

  it("public schools carry the in-state note", () => {
    const mc = card("47-2111").path.programs.find((p) => p.record_id === "UNITID-163426")!;
    expect(selectNetPrice(mc, null).residency_note).toMatch(/in-state/);
  });

  it("sorts programs serving the student's state first", () => {
    const programs = card("15-1252").path.programs;
    const sorted = sortPrograms(programs, zipStatus("22201"));
    const firstNonVa = sorted.findIndex((p) => p.state !== "VA");
    expect(sorted.slice(firstNonVa).every((p) => p.state !== "VA")).toBe(true);
  });
});

describe("sources", () => {
  it("every value on the demo cards has a source", () => {
    const cards = DEMO.map(card);
    for (const c of cards) {
      expect(c.title.source).not.toBeNull();
      expect(c.tasks.source).not.toBeNull();
      expect(c.path.entry_education.source).not.toBeNull();
      expect(c.path.job_zone_label.source).not.toBeNull();
      for (const k of ["national", "outside_region", "DC", "MD", "VA"] as const) expect(c.wages[k].source).not.toBeNull();
      for (const p of c.path.programs) {
        expect(p.program_source).not.toBeNull();
        for (const k of NET_PRICE_KEYS) expect(p.net_price[k].source).not.toBeNull();
      }
    }
  });

  it("the banner lists the wage source that matches the ZIP", () => {
    const cards = DEMO.map(card);
    const national = sourcesOnScreen(cards, zipStatus("10001"), null);
    const va = sourcesOnScreen(cards, zipStatus("22201"), null);
    expect(national).toContainEqual(repo.occupationSource("national_wages_2025"));
    expect(va).toContainEqual(repo.occupationSource("state_wages_2025"));
  });
});
