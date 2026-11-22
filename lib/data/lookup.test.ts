import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { institutionSource, wagesFor } from "./lookup";
import type { InstitutionsFile, OccupationsFile } from "./schemas";

const load = <T>(f: string): T =>
  JSON.parse(readFileSync(join(__dirname, "..", "..", "data", f), "utf8")) as T;
const occFile = load<OccupationsFile>("occupations.json");
const instFile = load<InstitutionsFile>("institutions.json");
const fs = occFile.metadata.field_sources;
const occ = (soc: string) => structuredClone(occFile.occupations.find((o) => o.soc_code === soc)!);
const inst = (id: string) => structuredClone(instFile.institutions.find((i) => i.record_id === id)!);

describe("wagesFor", () => {
  it("uses state percentiles when the row is complete", () => {
    const w = wagesFor(occ("47-2111"), "VA", fs);
    expect(w.scope).toBe("state");
    expect(w.percentiles.median).toBe(occ("47-2111").state_wages_2025.VA!.median_wage);
    expect(w.badge).toBeNull();
    expect(w.data_vintage).toBe("May 2025");
  });

  it("uses state percentiles when only employment is null (47-2231 VA)", () => {
    const w = wagesFor(occ("47-2231"), "VA", fs);
    expect(w).toMatchObject({ scope: "state", employment: null, badge: "Employment not published" });
    expect(w.percentiles.median).toBe(occ("47-2231").state_wages_2025.VA!.median_wage);
  });

  it("falls back to national when the percentiles are null (19-3033 MD)", () => {
    const w = wagesFor(occ("19-3033"), "MD", fs);
    expect(w).toMatchObject({ scope: "national", badge: "National wages shown", employment: null });
    expect(w.percentiles.median).toBe(occ("19-3033").national_wages_2025.median_50th);
  });

  it("falls back to national when there is no state row (49-9081 DC)", () => {
    expect(wagesFor(occ("49-9081"), "DC", fs)).toMatchObject({ scope: "national", badge: "National wages shown" });
  });

  it("falls back to national when any one percentile is null", () => {
    const o = occ("47-2111");
    o.state_wages_2025.MD!.wage_90th = null;
    expect(wagesFor(o, "MD", fs).scope).toBe("national");
  });

  it("uses national with no badge when no state is given", () => {
    expect(wagesFor(occ("47-2111"), null, fs)).toMatchObject({ scope: "national", badge: null });
  });
});

describe("institutionSource", () => {
  it("reads data_vintage and source_url from the record's provenance", () => {
    const i = inst("UNITID-131520");
    expect(institutionSource(i, "cost_and_net_price")).toEqual({
      source: i.provenance.cost_and_net_price!.source,
      data_vintage: i.provenance.cost_and_net_price!.data_vintage,
      source_url: i.provenance.cost_and_net_price!.source_url,
    });
  });

  it("returns a null data_vintage for sponsors, whose provenance has none", () => {
    const s = institutionSource(inst("APPR-IBEW26"), "apprenticeship");
    expect(s).toMatchObject({ data_vintage: null, source_url: "https://jatc26.org/" });
  });

  it("does not fall back to field_sources when the section is missing", () => {
    const i = inst("UNITID-131520");
    delete i.provenance.admissions;
    expect(institutionSource(i, "admissions")).toBeNull();
    expect(institutionSource(inst("APPR-IBEW26"), "cost_and_net_price")).toBeNull();
  });
});
