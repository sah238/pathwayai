import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkCardFields,
  checkProvenance,
  checkProviders,
  checkQ4,
  checkRegion,
  checkSchema,
  checkZeros,
  countDataQualityFlags,
  isFlagged,
  type StudentFixture,
} from "./audit";
import type { Institution, InstitutionsFile, Occupation, OccupationsFile } from "./schemas";

const load = <T>(f: string): T =>
  JSON.parse(readFileSync(join(__dirname, "..", "..", "data", f), "utf8")) as T;
const occFile = () => load<OccupationsFile>("occupations.json");
const instFile = () => load<InstitutionsFile>("institutions.json");

/** A clean occupation (Electricians: no flags, full DMV wages) and Title IV school. */
const occ = (): Occupation => structuredClone(occFile().occupations.find((o) => o.soc_code === "47-2111")!);
const school = (): Institution => structuredClone(instFile().institutions.find((i) => i.record_id === "UNITID-131520")!);

const fixture = (q4: { most_important: string[]; least_important: string }, zip = "22201"): StudentFixture => ({
  name: "test.json",
  data: { quiz_responses: { q4_values_most_least: q4, q11_zip_code: zip } },
});

describe("isFlagged", () => {
  const flags = [{ field: "state_wages_2025", issue: "x" }, { field: "work_profile.a, work_profile.b", issue: "y" }];
  it("matches the path or a descendant", () => {
    expect(isFlagged(flags, "state_wages_2025")).toBe(true);
    expect(isFlagged(flags, "state_wages_2025.DC")).toBe(true);
    expect(isFlagged(flags, "work_profile.b")).toBe(true);
  });
  it("does not match a sibling or a prefix that isn't a path segment", () => {
    expect(isFlagged(flags, "state_wages_2025x")).toBe(false);
    expect(isFlagged(flags, "work_profile")).toBe(false);
  });
});

describe("checkSchema", () => {
  it("passes the real files", () => {
    expect(checkSchema(occFile(), instFile())).toEqual([]);
  });
  it("names the record that fails", () => {
    const f = occFile();
    (f.occupations[0] as Record<string, unknown>).extra = true;
    const out = checkSchema(f, instFile());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ severity: "error", record: f.occupations[0].soc_code });
  });
});

describe("checkRegion", () => {
  it("flags a school outside DC/MD/VA and a ZIP that disagrees with its state", () => {
    const ca = school();
    ca.location = { ...ca.location, state: "CA", zip5: "94720" };
    const wrongZip = school();
    wrongZip.location = { ...wrongZip.location, state: "VA" }; // 20059 is DC
    const out = checkRegion([], [school(), ca, wrongZip]);
    expect(out.filter((f) => f.severity === "error").map((f) => f.path)).toEqual([
      "location.state",
      "location.zip5",
      "location.zip5",
    ]);
  });

  it("flags a non-DMV state wage row", () => {
    const o = occ();
    (o.state_wages_2025 as Record<string, unknown>).CA = o.state_wages_2025.DC;
    expect(checkRegion([o], [])).toEqual([expect.objectContaining({ severity: "error", path: "state_wages_2025.CA" })]);
  });

  it("errors when coverage says yes but the row is missing; known when coverage says so", () => {
    const lying = occ();
    delete lying.state_wages_2025.DC;
    expect(checkRegion([lying], [])[0]).toMatchObject({ severity: "error", path: "state_wages_2025.DC" });

    const honest = occ();
    delete honest.state_wages_2025.DC;
    honest.dmv_wage_coverage.DC = "no data";
    expect(checkRegion([honest], [])[0]).toMatchObject({ severity: "known" });
  });

  it("reports an out-of-region fixture ZIP as info", () => {
    const fx = fixture({ most_important: [], least_important: "" }, "10001");
    expect(checkRegion([], [], [fx])).toEqual([expect.objectContaining({ severity: "info", file: "fixtures" })]);
  });
});

describe("checkZeros", () => {
  it("treats CDR 0 as handled when display is false, warns when true", () => {
    const hidden = school();
    const shown = school();
    shown.outcomes_and_debt.cohort_default_rate_display = true;
    expect(checkZeros([], [hidden])).toEqual([expect.objectContaining({ severity: "known" })]);
    expect(checkZeros([], [shown])).toEqual([expect.objectContaining({ severity: "warn" })]);
  });

  it("warns on a 0 wage, and ignores a 0 growth rate", () => {
    const o = occ();
    o.national_wages_2025.entry_10th = 0;
    o.projections_2025_2035.job_growth_pct = 0;
    const out = checkZeros([o], []);
    expect(out).toEqual([expect.objectContaining({ severity: "warn", path: "national_wages_2025.entry_10th" })]);
  });

  it("finds no zeros in a clean occupation", () => {
    expect(checkZeros([occ()], [])).toEqual([]);
  });
});

describe("checkCardFields", () => {
  it("marks a missing field known only when flagged", () => {
    const flagged = occ();
    flagged.soc_code = "00-0001";
    flagged.work_values = null;
    flagged.data_quality_flags = [{ field: "work_values", issue: "not rated" }];
    const unflagged = occ();
    unflagged.soc_code = "00-0002";
    unflagged.work_values = null;
    const { rows, findings } = checkCardFields([occ(), flagged, unflagged], [school()]);
    expect(rows.find((r) => r.item.startsWith("work_values ("))).toMatchObject({ status: "partial", coverage: "1/3" });
    const wv = findings.filter((f) => f.path === "work_values");
    expect(wv.map((f) => [f.record, f.severity])).toEqual([["00-0001", "known"], ["00-0002", "warn"]]);
  });

  it("lists metro as deferred", () => {
    const { rows } = checkCardFields([occ()], [school()]);
    expect(rows.filter((r) => r.status === "deferred").map((r) => r.item)).toEqual([
      "metro wages",
      "ZIP → metro (zip_cbsa.json)",
    ]);
  });
});

describe("checkProvenance", () => {
  it("warns on a field with no field_sources entry", () => {
    const f = occFile();
    f.occupations = [occ()];
    delete f.metadata.field_sources.description;
    expect(checkProvenance(f, instFile()).filter((x) => x.path === "description")).toEqual([
      expect.objectContaining({ severity: "warn" }),
    ]);
  });

  it("errors when a Title IV record has no provenance for a section", () => {
    const f = instFile();
    const s = school();
    delete s.provenance.cost_and_net_price;
    f.institutions = [s];
    expect(checkProvenance(occFile(), f).filter((x) => x.file === "institutions.json")).toEqual([
      expect.objectContaining({ severity: "error", path: "provenance.cost_and_net_price" }),
    ]);
  });
});

describe("checkProviders", () => {
  it("marks an empty dmv_providers known when flagged, warn when not", () => {
    const flagged = occ();
    flagged.cip_routing.dmv_providers = [];
    flagged.data_quality_flags = [{ field: "cip_routing.dmv_providers", issue: "none" }];
    const unflagged = occ();
    unflagged.cip_routing.dmv_providers = [];
    const out = checkProviders([flagged, unflagged], []);
    expect(out.map((f) => f.severity)).toEqual(["known", "warn"]);
  });

  it("errors on a dangling provider id", () => {
    const o = occ();
    o.cip_routing.dmv_providers = ["UNITID-999999"];
    const errors = checkProviders([o], [school()]).filter((f) => f.severity === "error");
    expect(errors).toEqual([expect.objectContaining({ message: "UNITID-999999 is not a record_id in institutions.json" })]);
  });

  it("counts programs with 0 or null completers", () => {
    const s = school();
    s.programs = [
      { ...s.programs[0], completers_2yr: 0 },
      { ...s.programs[0], completers_2yr: null },
      { ...s.programs[0], completers_2yr: 5 },
    ];
    expect(checkProviders([], [s]).map((f) => f.message)).toEqual([
      "1 of 3 programs have 0 completers (excluded from dmv_providers)",
      "1 of 3 programs have null completers (not reported)",
    ]);
  });
});

describe("checkQ4", () => {
  it("reports curiosity and null work_values as known, not errors", () => {
    const o = occ();
    o.work_values = null;
    const out = checkQ4([occ(), o]);
    expect(out.filter((f) => f.severity === "error")).toEqual([]);
    expect(out.filter((f) => f.severity === "known").map((f) => f.path)).toEqual(["work_values.curiosity", "work_values"]);
  });

  it("errors on a fixture answer that isn't an exact Q4 label", () => {
    const fx = fixture({ most_important: ["Good pay and steady work", "Good pay"], least_important: "Get noticed and move up" });
    const errors = checkQ4([occ()], [fx]).filter((f) => f.severity === "error");
    expect(errors).toEqual([expect.objectContaining({ path: "quiz_responses.q4_values_most_least.most_important[1]" })]);
  });

  it("passes all the real fixtures' Q4 answers", () => {
    const names = ["student_01.json", "student_05.json", "student_10.json"];
    const fixtures = names.map((name) => ({ name, data: load<StudentFixture["data"]>(join("fixtures", name)) }));
    expect(checkQ4([occ()], fixtures).filter((f) => f.severity === "error")).toEqual([]);
  });
});

describe("countDataQualityFlags", () => {
  it("counts per field and per record", () => {
    const a = { data_quality_flags: [{ field: "x", issue: "" }, { field: "y", issue: "" }] };
    const b = { data_quality_flags: [{ field: "x", issue: "" }] };
    expect(countDataQualityFlags([a, b, { data_quality_flags: [] }])).toEqual({ total: 3, records: 2, byField: { x: 2, y: 1 } });
  });
});
