/**
 * Zod schemas for data v1.3.0 (data/occupations.json, data/institutions.json).
 *
 * They describe the files exactly as they are today: objects are strict (an
 * extra or renamed field fails), closed vocabularies are enums of the values
 * present now, and a field is nullable only where the data has nulls. If the
 * dataset changes shape, update these schemas on purpose.
 *
 * Null means "missing / not loaded", never zero (CLAUDE.md rule 3).
 */
import { z } from "zod";
import { DMV_STATES, ONET_WORK_VALUES } from "./constants";

const num = z.number();
const nullableNum = z.number().nullable();
const int = z.number().int();

const DmvStateSchema = z.enum(DMV_STATES);

const FieldSourceSchema = z.strictObject({
  source: z.string(),
  data_vintage: z.string().nullable(),
  source_url: z.string().nullable(),
});

export const DataQualityFlagSchema = z.strictObject({
  /** Dotted field path, or several separated by ", ". */
  field: z.string(),
  issue: z.string(),
});
export type DataQualityFlag = z.infer<typeof DataQualityFlagSchema>;

// ---------------------------------------------------------------------------
// Occupations
// ---------------------------------------------------------------------------

export const AiExposureTierSchema = z.enum(["Low", "Moderate", "High", "Very high"]);

export const EntryEducationSchema = z.enum([
  "No formal educational credential",
  "High school diploma or equivalent",
  "Postsecondary nondegree award",
  "Associate's degree",
  "Bachelor's degree",
  "Master's degree",
  "Doctoral or professional degree",
]);

export const TrainingPathwaySchema = z.enum([
  "Registered Apprenticeship",
  "Entry-Level + Moderate-term on-the-job training",
  "Entry-Level + Long-term on-the-job training",
  "Direct Entry + Short-Term OJT",
  "Postsecondary Certificate / License",
  "2-Year Associate Degree",
  "4-Year Bachelor’s Degree", // curly apostrophe, as in the file
  "Graduate / Professional Degree",
  "Internship / Residency",
]);

export const BlsOjtCategorySchema = z.enum([
  "Apprenticeship",
  "Short-term on-the-job training",
  "Moderate-term on-the-job training",
  "Long-term on-the-job training",
  "Internship/residency",
]);

export const WorkEnvironmentLabelSchema = z.enum([
  "Indoors",
  "Outdoors",
  "Physical/Active",
  "Desk/Seated",
  "High Public Contact",
]);

export const HoursScheduleLabelSchema = z.enum([
  "Standard Schedule",
  "Standard 40hr",
  "Shift/Irregular",
  "Overtime Common (>40hr)",
  "Part-Time/Flexible (<40hr)",
]);

/** @deprecated Legacy labels. Use `work_values` for Q4 matching. */
export const ValueSystemLabelSchema = z.enum([
  "Independence & Autonomy",
  "Helping People & Community",
  "Practical Skill & Stability",
  "Environment & Sustainability",
  "Helping Animals",
  "High Earning Potential",
]);

export const CredentialLevelLabelSchema = z.enum([
  "Undergraduate certificate",
  "Associate's",
  "Bachelor's",
  "Master's",
  "Doctoral",
  "First professional",
]);

export const CipRoutingStatusSchema = z.enum([
  "Matched at the credential level the career requires",
  "Certificate programs shown as the nearest Title IV route; the typical path is on-the-job training or apprenticeship",
]);

export const DmvWageCoverageSchema = z.enum([
  "yes",
  "no data",
  "employment missing",
  "wages suppressed",
]);

const OnetWorkValueSchema = z.enum(ONET_WORK_VALUES);

export const WorkValuesSchema = z.strictObject({
  scale: z.literal("Extent, 1 (low) to 7 (high)"),
  scores: z.strictObject({
    achievement: num,
    working_conditions: num,
    recognition: num,
    relationships: num,
    support: num,
    independence: num,
  }),
  high_points: z.array(OnetWorkValueSchema),
  /** No dataset field yet; pending a team decision (values-quiz.md, Q4). */
  curiosity: z.null(),
  rating_date: z.string().regex(/^\d{2}\/\d{4}$/),
  domain_source: z.enum(["Analyst", "Analyst - Transition"]),
});
export type WorkValues = z.infer<typeof WorkValuesSchema>;

export const StateWageSchema = z.strictObject({
  state_name: z.enum(["District of Columbia", "Maryland", "Virginia"]),
  employment: nullableNum,
  wage_10th: nullableNum,
  wage_25th: nullableNum,
  median_wage: nullableNum,
  wage_75th: nullableNum,
  wage_90th: nullableNum,
});
export type StateWage = z.infer<typeof StateWageSchema>;

export const OccupationSchema = z.strictObject({
  soc_code: z.string().regex(/^\d{2}-\d{4}$/),
  onet_code: z.string().regex(/^\d{2}-\d{4}\.\d{2}$/),
  onet_mapping_type: z.literal("Exact (.00)"),
  career_title: z.string(),
  bls_title: z.string(),
  lay_job_titles: z.array(z.string()),
  description: z.string(),
  core_tasks: z.array(z.string()),
  emerging_tasks: z.array(z.string()),
  task_counts: z.strictObject({ core: int, total: int }),
  education_and_training: z.strictObject({
    entry_education: EntryEducationSchema,
    training_pathway: TrainingPathwaySchema,
    bls_ojt_category: BlsOjtCategorySchema.nullable(),
    related_work_experience: z.string().nullable(),
    job_zone: int.min(1).max(5),
    job_zone_label: z.string(),
  }),
  work_profile: z.strictObject({
    /** Null = not yet loaded (29-2042 EMTs). */
    work_environment: z.array(WorkEnvironmentLabelSchema).nullable(),
    /** Null = not yet loaded (29-2042 EMTs). */
    hours_and_schedule: z.array(HoursScheduleLabelSchema).nullable(),
    work_culture_styles: z.array(z.string()),
    /** @deprecated Legacy labels; do not use for Q4 matching. */
    value_system: z.array(ValueSystemLabelSchema),
    riasec_code: z.string().regex(/^[RIASEC]{1,3}$/),
    riasec_top3_detail: z.string(),
    top_software_skills: z.array(z.string()),
  }),
  national_wages_2025: z.strictObject({
    entry_10th: num,
    entry_25th: num,
    median_50th: num,
    experienced_75th: num,
    top_90th: num,
    geography_scope: z.literal("National OEWS (May 2025)"),
  }),
  projections_2025_2035: z.strictObject({
    employment_2025_k: num,
    employment_2035_k: num,
    job_change_k: num,
    job_growth_pct: num,
    annual_openings_k: num,
    total_separations_rate_pct: num,
    pct_self_employed_2025: nullableNum,
    ai_exposure_tier: AiExposureTierSchema,
  }),
  cip_routing: z.strictObject({
    status: CipRoutingStatusSchema,
    related_programs: z.array(
      z.strictObject({ cip6: z.string().regex(/^\d{2}\.\d{4}$/), title: z.string() }),
    ),
    median_program_debt: num,
    median_1yr_earnings: num,
    aggregation_note: z.string(),
    /** 4-digit CIP without the dot ("4603"); programs[].cip4 has it ("46.03"). */
    cip4_families: z.array(z.string().regex(/^\d{4}$/)),
    credential_levels: z.array(CredentialLevelLabelSchema),
    n_programs_debt: int,
    n_programs_earnings: int,
    /** institutions.json record_ids with recent completers, plus apprenticeship sponsors. */
    dmv_providers: z.array(z.string()),
    /** record_ids whose matching program has a null completers_2yr. */
    dmv_providers_unconfirmed: z.array(z.string()),
  }),
  state_wages_2025: z.partialRecord(DmvStateSchema, StateWageSchema),
  dmv_wage_coverage: z.strictObject({
    DC: DmvWageCoverageSchema,
    MD: DmvWageCoverageSchema,
    VA: DmvWageCoverageSchema,
  }),
  data_quality_flags: z.array(DataQualityFlagSchema),
  /** Null for 15-1252, 15-2051, 29-2042: never rated by O*NET. */
  work_values: WorkValuesSchema.nullable(),
});
export type Occupation = z.infer<typeof OccupationSchema>;

export const OccupationsFileSchema = z
  .strictObject({
    metadata: z.strictObject({
      schema_version: z.string(),
      dataset: z.string(),
      record_count: int,
      sources: z.array(z.string()),
      geographic_scope: z.string(),
      revision_notes: z.string(),
      /** Keyed by dotted field path; applies to that field and its children. */
      field_sources: z.record(z.string(), FieldSourceSchema),
      known_open_issues: z.array(z.string()),
    }),
    occupations: z.array(OccupationSchema),
  })
  .refine((f) => f.metadata.record_count === f.occupations.length, {
    message: "metadata.record_count does not match the number of occupations",
    path: ["metadata", "record_count"],
  });
export type OccupationsFile = z.infer<typeof OccupationsFileSchema>;

// ---------------------------------------------------------------------------
// Institutions (Title IV schools and registered apprenticeship sponsors)
// ---------------------------------------------------------------------------

export const ProviderTypeSchema = z.enum([
  "Title IV institution",
  "Registered apprenticeship sponsor (RAPIDS)",
]);

export const ProgramCredentialSchema = z.enum([
  "Undergraduate certificate",
  "Associate's",
  "Bachelor's",
  "Master's",
  "Doctoral",
  "First professional",
  "Registered apprenticeship",
]);

export const ProgramSchema = z.strictObject({
  /** Null on apprenticeship programs. */
  cip4: z.string().regex(/^\d{2}\.\d{2}$/).nullable(),
  title: z.string(),
  /** Scorecard CREDLEV; null on apprenticeship programs. */
  credential_level: int.nullable(),
  credential: ProgramCredentialSchema,
  related_soc_codes: z.array(z.string().regex(/^\d{2}-\d{4}$/)),
  completers_2yr: int.nullable(),
  median_debt: nullableNum,
  median_1yr_earnings: nullableNum,
  distance_only: z.boolean(),
});
export type Program = z.infer<typeof ProgramSchema>;

const ProvenanceEntrySchema = z.strictObject({
  source: z.string(),
  data_vintage: z.string().optional(),
  source_url: z.string(),
});

export const InstitutionSchema = z.strictObject({
  record_id: z.string().regex(/^(UNITID-\d+|APPR-[A-Z0-9]+)$/),
  unitid: int.nullable(),
  opeid: int.nullable(),
  name: z.string(),
  provider_type: ProviderTypeSchema,
  location: z.strictObject({
    city: z.string(),
    state: z.string().length(2),
    zip_raw: z.string(),
    zip5: z.string().regex(/^\d{5}$/),
  }),
  control: z.enum(["Public", "Private Nonprofit"]).nullable(),
  predominant_degree: z.enum([
    "Bachelor’s", // curly apostrophe, as in the file
    "Associate",
    "Registered Apprenticeship",
  ]),
  admissions: z.strictObject({ admission_rate: nullableNum }),
  cost_and_net_price: z.strictObject({
    avg_net_price: nullableNum,
    net_price_tier1_0_30k: nullableNum,
    net_price_tier2_30_48k: nullableNum,
    net_price_tier3_48_75k: nullableNum,
    net_price_tier4_75_110k: nullableNum,
    net_price_tier5_110k_plus: nullableNum,
    net_price_flag: z.enum([
      "Standard net price",
      "Not applicable (paid registered apprenticeship)",
    ]),
  }),
  outcomes_and_debt: z.strictObject({
    completion_rate_150pct: nullableNum,
    retention_rate_ft: nullableNum,
    /** 0.0 is the real pandemic-era value; hidden when display is false. */
    cohort_default_rate_3yr: nullableNum,
    cohort_default_rate_cohort_fy: z.null(),
    cohort_default_rate_display: z.boolean(),
    repayment_rate_3yr: nullableNum,
    median_grad_debt: nullableNum,
    median_earnings_6yr: nullableNum,
    median_earnings_10yr: nullableNum,
  }),
  programs: z.array(ProgramSchema),
  apprenticeship: z
    .strictObject({
      related_soc_codes: z.array(z.string().regex(/^\d{2}-\d{4}$/)),
      registered_in: z.array(DmvStateSchema),
      service_area: z.string(),
      program_length_years: num,
      sources: z.array(z.string()),
    })
    .nullable(),
  provenance: z.strictObject({
    admissions: ProvenanceEntrySchema.optional(),
    cost_and_net_price: ProvenanceEntrySchema.optional(),
    outcomes_and_debt: ProvenanceEntrySchema.optional(),
    apprenticeship: ProvenanceEntrySchema.optional(),
  }),
  data_quality_flags: z.array(DataQualityFlagSchema),
  data_status: z.string(),
  notes: z.string().nullable(),
});
export type Institution = z.infer<typeof InstitutionSchema>;

export const InstitutionsFileSchema = z
  .strictObject({
    metadata: z.strictObject({
      schema_version: z.string(),
      dataset: z.string(),
      record_count: int,
      source: z.string(),
      geographic_scope: z.string(),
      composition: z.strictObject({
        title_iv_institutions: int,
        registered_apprenticeship_sponsors: int,
      }),
      revision_notes: z.string(),
      field_sources: z.strictObject({
        default: FieldSourceSchema,
        programs: FieldSourceSchema,
        override: z.string(),
      }),
      known_open_issues: z.array(z.string()),
    }),
    institutions: z.array(InstitutionSchema),
  })
  .refine((f) => f.metadata.record_count === f.institutions.length, {
    message: "metadata.record_count does not match the number of institutions",
    path: ["metadata", "record_count"],
  });
export type InstitutionsFile = z.infer<typeof InstitutionsFileSchema>;
