import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DataValidationError, createRepository, repositoryFromRaw } from "./repository";
import type { InstitutionsFile, OccupationsFile } from "./schemas";
import { getRepository } from "./server";

const load = <T>(f: string): T =>
  JSON.parse(readFileSync(join(__dirname, "..", "..", "data", f), "utf8")) as T;
const occFile = () => load<OccupationsFile>("occupations.json");
const instFile = () => load<InstitutionsFile>("institutions.json");

const repo = getRepository();

describe("server loader", () => {
  it("loads and validates both real files", () => {
    expect(repo.listOccupations()).toHaveLength(30);
    expect(repo.listInstitutions(null)).toHaveLength(20);
  });

  it("throws DataValidationError on an invalid file", () => {
    const bad = occFile();
    (bad.occupations[0] as Record<string, unknown>).extra = true;
    expect(() => repositoryFromRaw(bad, instFile())).toThrow(DataValidationError);
    expect(() => repositoryFromRaw(bad, instFile())).toThrow(/occupations\.json failed schema validation/);
  });
});

describe("Occupation", () => {
  it("gets by SOC, null when unknown", () => {
    expect(repo.getOccupation("47-2111")?.career_title).toBe("Electricians");
    expect(repo.getOccupation("99-9999")).toBeNull();
  });

  it("listOccupations returns all 30, unfiltered, as a copy", () => {
    const list = repo.listOccupations();
    list.pop();
    expect(repo.listOccupations()).toHaveLength(30);
  });

  it("resolves field sources from the field or its nearest parent", () => {
    expect(repo.occupationSource("projections_2025_2035.ai_exposure_tier")?.data_vintage).toBe("Aug 27, 2026");
    expect(repo.occupationSource("projections_2025_2035.job_growth_pct")?.source).toBe("U.S. BLS Employment Projections 2025-35");
    expect(repo.occupationSource("state_wages_2025.DC.wage_90th")?.data_vintage).toBe("May 2025");
    expect(repo.occupationSource("no_such_field")).toBeNull();
  });
});

describe("AreaWages", () => {
  it("uses state wages, VA employment-only gap included", () => {
    expect(repo.getAreaWages("47-2231", "VA")).toMatchObject({ scope: "state", employment: null });
  });
  it("falls back to national for suppressed or missing rows", () => {
    expect(repo.getAreaWages("19-3033", "MD")?.scope).toBe("national");
    expect(repo.getAreaWages("49-9081", "DC")?.scope).toBe("national");
  });
  it("is national with no badge when no state, and null for an unknown SOC", () => {
    expect(repo.getAreaWages("47-2111", null)).toMatchObject({ scope: "national", badge: null });
    expect(repo.getAreaWages("99-9999", "VA")).toBeNull();
  });
});

describe("listInstitutions / getInstitution", () => {
  it("filters by location.state", () => {
    const counts = Object.fromEntries((["DC", "MD", "VA"] as const).map((s) => [s, repo.listInstitutions(s).length]));
    expect(counts).toEqual({ DC: 2, MD: 12, VA: 6 });
    expect(repo.listInstitutions("VA").every((v) => v.institution.location.state === "VA")).toBe(true);
  });

  it("takes sources from each record's provenance", () => {
    const howard = repo.getInstitution("UNITID-131520")!;
    expect(howard.sources.cost_and_net_price).toEqual(howard.institution.provenance.cost_and_net_price);
    expect(howard.sources.apprenticeship).toBeNull();
    const ibew = repo.getInstitution("APPR-IBEW26")!;
    expect(ibew.sources).toMatchObject({ cost_and_net_price: null, apprenticeship: { source_url: "https://jatc26.org/" } });
    expect(repo.getInstitution("UNITID-0")).toBeNull();
  });
});

describe("InstitutionProgram", () => {
  it("confirmed providers match cip_routing.dmv_providers for all 30 careers", () => {
    for (const occ of repo.listOccupations()) {
      const got = new Set(repo.programsForOccupation(occ.soc_code)!.confirmed.map((p) => p.record_id));
      expect([...got].sort(), occ.soc_code).toEqual([...occ.cip_routing.dmv_providers].sort());
    }
  });

  it("unconfirmed providers match dmv_providers_unconfirmed and have null completers", () => {
    for (const occ of repo.listOccupations()) {
      const { unconfirmed } = repo.programsForOccupation(occ.soc_code)!;
      expect([...new Set(unconfirmed.map((p) => p.record_id))].sort(), occ.soc_code).toEqual(
        [...occ.cip_routing.dmv_providers_unconfirmed].sort(),
      );
      expect(unconfirmed.every((p) => p.program.completers_2yr === null)).toBe(true);
    }
  });

  it("confirmed programs have recent completers at a required credential, or are apprenticeships", () => {
    for (const occ of repo.listOccupations()) {
      for (const p of repo.programsForOccupation(occ.soc_code)!.confirmed) {
        if (p.program.credential === "Registered apprenticeship") {
          expect(p.apprenticeship?.related_soc_codes).toContain(occ.soc_code);
        } else {
          expect(p.program.completers_2yr).toBeGreaterThan(0);
          expect(occ.cip_routing.credential_levels).toContain(p.program.credential);
        }
      }
    }
  });

  it("returns empty lists when there is no local program, null for an unknown SOC", () => {
    expect(repo.programsForOccupation("49-9041")).toEqual({ confirmed: [], unconfirmed: [] });
    expect(repo.programsForOccupation("99-9999")).toBeNull();
  });

  it("every row carries its sources", () => {
    for (const occ of repo.listOccupations()) {
      for (const p of repo.programsForOccupation(occ.soc_code)!.confirmed) {
        if (p.provider_type === "Title IV institution") {
          expect(p.sources.program?.source_url).toBe("https://collegescorecard.ed.gov/data/");
          expect(p.sources.net_price?.source_url).toBeTruthy();
        } else {
          // Apprenticeship programs cite the sponsor, never the Scorecard file.
          expect(p.sources.program).toEqual(p.sources.apprenticeship);
          expect(p.sources.program?.source_url).not.toContain("collegescorecard");
        }
      }
    }
  });

  it("works on a modified copy via createRepository", () => {
    const occ = occFile();
    const inst = instFile();
    const electricians = occ.occupations.find((o) => o.soc_code === "47-2111")!;
    electricians.cip_routing.dmv_providers = ["APPR-IBEW26"];
    const r = createRepository(occ, inst);
    expect(r.programsForOccupation("47-2111")!.confirmed.map((p) => p.record_id)).toEqual(["APPR-IBEW26"]);
  });
});

describe("lookupZip", () => {
  it("maps DC/MD/VA ZIPs to a state, with no metro yet", () => {
    expect(repo.lookupZip("22201")).toEqual({ zip: "22201", state: "VA", cbsa: null, cbsa_name: null, method: "zip_prefix" });
    expect(repo.lookupZip("20019").state).toBe("DC");
    expect(repo.lookupZip("21701").state).toBe("MD");
  });

  it("returns state null outside DC/MD/VA", () => {
    expect(repo.lookupZip("10001")).toMatchObject({ state: null, cbsa: null });
    expect(repo.lookupZip("94720").state).toBeNull();
    expect(repo.lookupZip("24701").state).toBeNull();
    expect(repo.lookupZip("abcde").state).toBeNull();
  });
});
