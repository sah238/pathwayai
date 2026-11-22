import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InstitutionsFileSchema, OccupationsFileSchema } from "./schemas";

const load = (f: string) => JSON.parse(readFileSync(join(__dirname, "..", "..", "data", f), "utf8"));

describe("data v1.3.0 matches the schemas", () => {
  it("occupations.json parses", () => {
    const r = OccupationsFileSchema.safeParse(load("occupations.json"));
    expect(r.error?.issues ?? []).toEqual([]);
    expect(r.data?.occupations).toHaveLength(30);
  });

  it("institutions.json parses", () => {
    const r = InstitutionsFileSchema.safeParse(load("institutions.json"));
    expect(r.error?.issues ?? []).toEqual([]);
    expect(r.data?.institutions).toHaveLength(20);
  });

  it("rejects an unknown field (strict objects)", () => {
    const file = load("occupations.json");
    file.occupations[0].made_up_field = 1;
    expect(OccupationsFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejects a provider_type outside the enum", () => {
    const file = load("institutions.json");
    file.institutions[0].provider_type = "Registered apprenticeship sponsor";
    expect(InstitutionsFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejects a record_count that doesn't match", () => {
    const file = load("institutions.json");
    file.metadata.record_count = 21;
    expect(InstitutionsFileSchema.safeParse(file).success).toBe(false);
  });
});
