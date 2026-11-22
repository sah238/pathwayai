/** Builds the browse page's props from the repository. Used by the server page. */
import type { Source } from "@/lib/data/provenance";
import type { DataRepository } from "@/lib/data/repository";
import { EntryEducationSchema } from "@/lib/data/schemas";
import { plainJobZoneLabel, type BrowseCareer } from "./logic";

export interface BrowseData {
  careers: BrowseCareer[];
  educationOptions: string[];
  jobZoneOptions: { value: number; label: string }[];
  sources: Source[];
}

const SHOWN_FIELDS = [
  "career_title",
  "description",
  "education_and_training.entry_education",
  "education_and_training.job_zone",
  "work_profile.riasec_code",
];

export function buildBrowseData(repo: Pick<DataRepository, "listOccupations" | "occupationSource">): BrowseData {
  const careers = repo
    .listOccupations()
    .map((o) => ({
      soc_code: o.soc_code,
      title: o.career_title,
      description: o.description,
      entry_education: o.education_and_training.entry_education,
      job_zone: o.education_and_training.job_zone,
      job_zone_label: plainJobZoneLabel(o.education_and_training.job_zone_label),
      riasec_code: o.work_profile.riasec_code,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const zones = new Map(careers.map((c) => [c.job_zone, c.job_zone_label]));
  const sources = new Map<string, Source>();
  for (const path of SHOWN_FIELDS) {
    const s = repo.occupationSource(path);
    if (s) sources.set(`${s.source}|${s.data_vintage}|${s.source_url}`, s);
  }

  return {
    careers,
    educationOptions: EntryEducationSchema.options.filter((e) => careers.some((c) => c.entry_education === e)),
    jobZoneOptions: [...zones].sort(([a], [b]) => a - b).map(([value, label]) => ({ value, label })),
    sources: [...sources.values()],
  };
}
