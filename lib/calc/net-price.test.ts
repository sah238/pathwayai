import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRepository, type DataRepository } from "@/lib/data/repository";
import type { Institution, InstitutionsFile, OccupationsFile } from "@/lib/data/schemas";
import { getRepository } from "@/lib/data/server";
import {
  INCOME_TIERS,
  MISSING_BADGE,
  NET_GRANT_SURPLUS_LABEL,
  NOT_APPLICABLE_LABEL,
  OVERALL_AVERAGE_LABEL,
  PER_YEAR,
  PUBLIC_RESIDENCY_NOTE,
  netPriceForTier,
  netPricesForOccupation,
  type IncomeTier,
  type NetPriceResult,
} from "./net-price";

const load = <T>(f: string): T =>
  JSON.parse(readFileSync(join(__dirname, "..", "..", "data", f), "utf8")) as T;

const PRIVATE = "UNITID-131520"; // Private Nonprofit
const PUBLIC = "UNITID-131399"; // Public
const SPONSOR = "APPR-IBEW26";
const TIERS = [1, 2, 3, 4, 5] as const satisfies readonly IncomeTier[];

const repo = getRepository();

/** A repository built from real files with one institution patched. */
function patched(recordId: string, edit: (inst: Institution) => void): DataRepository {
  const inst = load<InstitutionsFile>("institutions.json");
  const target = inst.institutions.find((i) => i.record_id === recordId);
  if (!target) throw new Error(`no ${recordId}`);
  edit(target);
  return createRepository(load<OccupationsFile>("occupations.json"), inst);
}

const priceFor = (r: DataRepository, id: string, tier: IncomeTier | null): NetPriceResult => {
  const view = r.getInstitution(id);
  if (!view) throw new Error(`no ${id}`);
  return netPriceForTier(view, tier);
};

describe("netPriceForTier: tier amounts", () => {
  it.each(TIERS)("tier %i returns the file's value per year with its source", (tier) => {
    const view = repo.getInstitution(PRIVATE)!;
    const r = netPriceForTier(view, tier);
    expect(r).toMatchObject({
      status: "amount",
      amount: view.institution.cost_and_net_price[INCOME_TIERS[tier].field],
      period: PER_YEAR,
      tier,
      record_id: PRIVATE,
    });
    expect(r.source).toEqual(view.sources.cost_and_net_price);
    expect(r.source?.source_url).toBeTruthy();
    if (r.status === "amount") {
      expect(r.label).toContain(PER_YEAR);
      expect(r.label).toContain(INCOME_TIERS[tier].label);
      expect(r.label).toContain("not a personal quote");
    }
  });

  it("is 28321 for the private school's lowest tier (matches the file)", () => {
    expect(priceFor(repo, PRIVATE, 1)).toMatchObject({ status: "amount", amount: 28321 });
  });
});

describe("netPriceForTier: zero and negative", () => {
  it.each([0, -1, -4250.5])("%d returns net grant surplus, never a negative amount", (v) => {
    const r = priceFor(patched(PRIVATE, (i) => (i.cost_and_net_price.net_price_tier1_0_30k = v)), PRIVATE, 1);
    expect(r).toMatchObject({
      status: "net_grant_surplus",
      label: NET_GRANT_SURPLUS_LABEL,
      reported_value: v,
      period: PER_YEAR,
      tier: 1,
    });
    expect(r).not.toHaveProperty("amount");
    expect(r.source).not.toBeNull();
  });

  it("only the zeroed tier changes; other tiers keep their own values", () => {
    const r = patched(PRIVATE, (i) => (i.cost_and_net_price.net_price_tier1_0_30k = 0));
    expect(priceFor(r, PRIVATE, 2)).toMatchObject({ status: "amount", amount: repo.getInstitution(PRIVATE)!.institution.cost_and_net_price.net_price_tier2_30_48k });
  });
});

describe("netPriceForTier: null", () => {
  it("a null tier on a standard-price school is missing with a reason, not 0", () => {
    const r = priceFor(patched(PRIVATE, (i) => (i.cost_and_net_price.net_price_tier3_48_75k = null)), PRIVATE, 3);
    expect(r).toMatchObject({ status: "missing", amount: null, reason: "tier_not_reported", badge: MISSING_BADGE, tier: 3 });
    expect(r.source).not.toBeNull();
  });

  it("does not borrow a neighbouring tier or the average when a tier is null", () => {
    const r = patched(PRIVATE, (i) => {
      i.cost_and_net_price.net_price_tier2_30_48k = null;
    });
    expect(priceFor(r, PRIVATE, 2).status).toBe("missing");
  });

  it("keeps the value but returns a null source when cost provenance is absent", () => {
    const r = priceFor(patched(PRIVATE, (i) => delete i.provenance.cost_and_net_price), PRIVATE, 1);
    expect(r).toMatchObject({ status: "amount", amount: 28321, source: null });
  });
});

describe("netPriceForTier: no tier selected (overall average)", () => {
  it("returns avg_net_price per year with its label and source", () => {
    const view = repo.getInstitution(PRIVATE)!;
    const r = netPriceForTier(view, null);
    expect(r).toMatchObject({
      status: "overall_average",
      amount: 33002,
      period: PER_YEAR,
      label: OVERALL_AVERAGE_LABEL,
      tier: null,
    });
    expect(r.source).toEqual(view.sources.cost_and_net_price);
  });

  it("null average is missing with its own reason", () => {
    const r = priceFor(patched(PRIVATE, (i) => (i.cost_and_net_price.avg_net_price = null)), PRIVATE, null);
    expect(r).toMatchObject({ status: "missing", amount: null, reason: "average_not_reported", tier: null });
  });

  it.each([0, -900])("average of %d is a net grant surplus", (v) => {
    const r = priceFor(patched(PRIVATE, (i) => (i.cost_and_net_price.avg_net_price = v)), PRIVATE, null);
    expect(r).toMatchObject({ status: "net_grant_surplus", reported_value: v, tier: null, label: NET_GRANT_SURPLUS_LABEL });
  });

  it("a null average does not fall back to a tier value", () => {
    const r = priceFor(patched(PRIVATE, (i) => (i.cost_and_net_price.avg_net_price = null)), PRIVATE, null);
    expect(r).not.toHaveProperty("amount", 28321);
  });
});

describe("netPriceForTier: public-school residency note", () => {
  it.each([...TIERS, null])("public school, tier %s, carries the in-state note", (tier) => {
    expect(priceFor(repo, PUBLIC, tier).residency_note).toBe(PUBLIC_RESIDENCY_NOTE);
  });

  it("is on missing and surplus results too", () => {
    const missing = priceFor(patched(PUBLIC, (i) => (i.cost_and_net_price.net_price_tier1_0_30k = null)), PUBLIC, 1);
    const surplus = priceFor(patched(PUBLIC, (i) => (i.cost_and_net_price.net_price_tier1_0_30k = -10)), PUBLIC, 1);
    expect(missing).toMatchObject({ status: "missing", residency_note: PUBLIC_RESIDENCY_NOTE });
    expect(surplus).toMatchObject({ status: "net_grant_surplus", residency_note: PUBLIC_RESIDENCY_NOTE });
  });

  it("private nonprofit schools and sponsors get no note", () => {
    expect(priceFor(repo, PRIVATE, 1).residency_note).toBeNull();
    expect(priceFor(repo, SPONSOR, 1).residency_note).toBeNull();
  });

  it("every public school in the data gets the note; no other school does", () => {
    for (const { institution } of repo.listInstitutions(null)) {
      const r = priceFor(repo, institution.record_id, null);
      expect(r.residency_note).toBe(institution.control === "Public" ? PUBLIC_RESIDENCY_NOTE : null);
    }
  });
});

describe("netPriceForTier: apprenticeship sponsors", () => {
  it.each([...TIERS, null])("tier %s is not applicable, not missing", (tier) => {
    const view = repo.getInstitution(SPONSOR)!;
    const r = netPriceForTier(view, tier);
    expect(r).toMatchObject({ status: "not_applicable", label: NOT_APPLICABLE_LABEL, tier });
    expect(r).not.toHaveProperty("reason");
    expect(r.source).toEqual(view.sources.apprenticeship);
    expect(r.source).not.toBeNull();
  });

  it("every sponsor in the data is not applicable", () => {
    const sponsors = repo
      .listInstitutions(null)
      .filter((i) => i.institution.provider_type === "Registered apprenticeship sponsor (RAPIDS)");
    expect(sponsors).toHaveLength(4);
    for (const s of sponsors) expect(netPriceForTier(s, 1).status).toBe("not_applicable");
  });
});

describe("netPricesForOccupation", () => {
  it("returns null for an unknown SOC", () => {
    expect(netPricesForOccupation(repo, "99-9999", 1)).toBeNull();
  });

  it("electricians: the college program gets an amount, the sponsor is not applicable", () => {
    const rows = netPricesForOccupation(repo, "47-2111", 2)!;
    const byId = Object.fromEntries(rows.map((r) => [r.program.record_id, r.net_price]));
    expect(byId["UNITID-163426"]).toMatchObject({ status: "amount", tier: 2, residency_note: PUBLIC_RESIDENCY_NOTE });
    expect(byId[SPONSOR]).toMatchObject({ status: "not_applicable" });
  });

  it("every confirmed program for every occupation gets a sourced result", () => {
    for (const occ of repo.listOccupations()) {
      for (const tier of [...TIERS, null]) {
        const rows = netPricesForOccupation(repo, occ.soc_code, tier)!;
        expect(rows).toHaveLength(repo.programsForOccupation(occ.soc_code)!.confirmed.length);
        for (const { net_price } of rows) {
          expect(["amount", "overall_average", "not_applicable"]).toContain(net_price.status);
          expect(net_price.source).not.toBeNull();
          if ("amount" in net_price && net_price.amount !== null) expect(net_price.amount).toBeGreaterThan(0);
        }
      }
    }
  });
});
