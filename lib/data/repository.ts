/**
 * Data repository: the one way app code reads the dataset. It serves the four
 * entities from CLAUDE.md (Occupation, AreaWages, InstitutionProgram,
 * ZipToCbsa) and every value comes with where it came from.
 *
 * `createRepository` is pure and takes already-validated files (tests pass
 * modified copies). `repositoryFromRaw` validates raw JSON first. App code
 * should use `getRepository()` from ./server, which is server-only.
 */
import type { DmvState } from "./constants";
import { zipToState } from "./geo";
import { wagesFor, type WageLookup } from "./lookup";
import { institutionSource, occupationSource, programSource, type Source } from "./provenance";
import {
  InstitutionsFileSchema,
  OccupationsFileSchema,
  type Institution,
  type InstitutionsFile,
  type Occupation,
  type OccupationsFile,
  type Program,
} from "./schemas";

// ---------------------------------------------------------------------------
// Entity shapes returned by the repository
// ---------------------------------------------------------------------------

export interface InstitutionSources {
  admissions: Source | null;
  cost_and_net_price: Source | null;
  outcomes_and_debt: Source | null;
  apprenticeship: Source | null;
}

export interface InstitutionView {
  institution: Institution;
  /** From the record's own provenance object, never field_sources. */
  sources: InstitutionSources;
}

/** One local program (or apprenticeship) for a career, joined to its provider. */
export interface InstitutionProgram {
  record_id: string;
  provider_name: string;
  provider_type: Institution["provider_type"];
  location: Institution["location"];
  program: Program;
  /** Provider-level net price; null tiers mean not loaded (apprenticeships: not applicable). */
  net_price: Institution["cost_and_net_price"];
  apprenticeship: Institution["apprenticeship"];
  sources: {
    /**
     * College programs: field_sources.programs (programs[] have no per-record
     * provenance). Apprenticeships: the sponsor's provenance.apprenticeship.
     * Null only if a sponsor has no provenance.
     */
    program: Source | null;
    net_price: Source | null;
    apprenticeship: Source | null;
  };
}

export interface ProgramsForOccupation {
  /** Programs with recent completers at the career's credential level, plus sponsors. Matches cip_routing.dmv_providers. */
  confirmed: InstitutionProgram[];
  /** Completer count not reported. Not shown as local options until confirmed. */
  unconfirmed: InstitutionProgram[];
}

export interface ZipLookup {
  zip: string;
  /** Null for a malformed ZIP or one outside DC/MD/VA. */
  state: DmvState | null;
  /** Metro matching is deferred (no zip_cbsa.json yet). */
  cbsa: null;
  cbsa_name: null;
  method: "zip_prefix";
}

export interface DataRepository {
  // Occupation
  getOccupation(soc: string): Occupation | null;
  /** All occupations, unfiltered. Filtering belongs to the matching step. */
  listOccupations(): Occupation[];
  /** Source of an occupation field by dotted path, e.g. "projections_2025_2035.ai_exposure_tier". */
  occupationSource(path: string): Source | null;
  // AreaWages
  /** State percentiles when all five exist (employment may be null), else national. Null for an unknown SOC. */
  getAreaWages(soc: string, state: DmvState | null): WageLookup | null;
  // InstitutionProgram
  /** Providers located in `state` (by location.state), or all when null. */
  listInstitutions(state: DmvState | null): InstitutionView[];
  getInstitution(recordId: string): InstitutionView | null;
  /** Null for an unknown SOC; empty lists when there is no local program. */
  programsForOccupation(soc: string): ProgramsForOccupation | null;
  // ZipToCbsa
  lookupZip(zip: string): ZipLookup;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createRepository(occFile: OccupationsFile, instFile: InstitutionsFile): DataRepository {
  const occBySoc = new Map(occFile.occupations.map((o) => [o.soc_code, o]));
  const instById = new Map(instFile.institutions.map((i) => [i.record_id, i]));
  const fieldSources = occFile.metadata.field_sources;
  const progSource = programSource(instFile.metadata.field_sources);

  const view = (inst: Institution): InstitutionView => ({
    institution: inst,
    sources: {
      admissions: institutionSource(inst, "admissions"),
      cost_and_net_price: institutionSource(inst, "cost_and_net_price"),
      outcomes_and_debt: institutionSource(inst, "outcomes_and_debt"),
      apprenticeship: institutionSource(inst, "apprenticeship"),
    },
  });

  const row = (inst: Institution, program: Program): InstitutionProgram => {
    const apprenticeship = institutionSource(inst, "apprenticeship");
    return {
      record_id: inst.record_id,
      provider_name: inst.name,
      provider_type: inst.provider_type,
      location: inst.location,
      program,
      net_price: inst.cost_and_net_price,
      apprenticeship: inst.apprenticeship,
      sources: {
        // Apprenticeship programs aren't in the Scorecard file; cite the sponsor's own provenance.
        program: program.credential === "Registered apprenticeship" ? apprenticeship : progSource,
        net_price: institutionSource(inst, "cost_and_net_price"),
        apprenticeship,
      },
    };
  };

  /**
   * A provider's programs for a career: the SOC is listed, and either it is a
   * sponsor's apprenticeship for that SOC, or the credential is one the career
   * requires. `completers` picks recent-completer (>0) or unreported (null) rows.
   */
  const matchingPrograms = (inst: Institution, occ: Occupation, completers: "positive" | "null") =>
    inst.programs.filter((p) => {
      if (!p.related_soc_codes.includes(occ.soc_code)) return false;
      if (p.credential === "Registered apprenticeship") {
        return completers === "positive" && !!inst.apprenticeship?.related_soc_codes.includes(occ.soc_code);
      }
      const levelOk = (occ.cip_routing.credential_levels as string[]).includes(p.credential);
      const countOk = completers === "positive" ? (p.completers_2yr ?? 0) > 0 : p.completers_2yr === null;
      return levelOk && countOk;
    });

  const programsFor = (occ: Occupation, ids: string[], completers: "positive" | "null") =>
    ids.flatMap((id) => {
      const inst = instById.get(id);
      return inst ? matchingPrograms(inst, occ, completers).map((p) => row(inst, p)) : [];
    });

  return {
    getOccupation: (soc) => occBySoc.get(soc) ?? null,
    listOccupations: () => [...occFile.occupations],
    occupationSource: (path) => occupationSource(fieldSources, path),

    getAreaWages(soc, state) {
      const occ = occBySoc.get(soc);
      return occ ? wagesFor(occ, state, fieldSources) : null;
    },

    listInstitutions: (state) =>
      instFile.institutions.filter((i) => state === null || i.location.state === state).map(view),
    getInstitution(recordId) {
      const inst = instById.get(recordId);
      return inst ? view(inst) : null;
    },

    programsForOccupation(soc) {
      const occ = occBySoc.get(soc);
      if (!occ) return null;
      return {
        confirmed: programsFor(occ, occ.cip_routing.dmv_providers, "positive"),
        unconfirmed: programsFor(occ, occ.cip_routing.dmv_providers_unconfirmed, "null"),
      };
    },

    lookupZip: (zip) => ({ zip, state: zipToState(zip), cbsa: null, cbsa_name: null, method: "zip_prefix" }),
  };
}

/** Thrown when a data file doesn't match its schema. */
export class DataValidationError extends Error {
  constructor(file: string, issues: { path: PropertyKey[]; message: string }[]) {
    const head = issues
      .slice(0, 5)
      .map((i) => `  ${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    super(`${file} failed schema validation (${issues.length} issues):\n${head}${issues.length > 5 ? "\n  …" : ""}`);
    this.name = "DataValidationError";
  }
}

/** Validate raw JSON against the schemas, then build the repository. Throws DataValidationError. */
export function repositoryFromRaw(occRaw: unknown, instRaw: unknown): DataRepository {
  const occ = OccupationsFileSchema.safeParse(occRaw);
  if (!occ.success) throw new DataValidationError("occupations.json", occ.error.issues);
  const inst = InstitutionsFileSchema.safeParse(instRaw);
  if (!inst.success) throw new DataValidationError("institutions.json", inst.error.issues);
  return createRepository(occ.data, inst.data);
}
