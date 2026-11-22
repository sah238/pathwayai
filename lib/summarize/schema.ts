/**
 * Stage 2 shapes: the request (three SOC codes and nothing else), what Claude
 * returns, and what /api/summarize returns.
 */
import { z } from "zod";
import type { Source } from "@/lib/data/provenance";

const SocSchema = z.string().regex(/^\d{2}-\d{4}$/);

/** Strict: any extra field (ZIP, income, free text) is rejected. */
export const SummarizeRequestSchema = z.strictObject({
  socs: z
    .tuple([SocSchema, SocSchema, SocSchema])
    .refine((socs) => new Set(socs).size === 3, { message: "SOC codes must be different" }),
});

/** What Claude returns. Sent to the API as the structured-output JSON schema. */
export const ModelOutputSchema = z.strictObject({
  summaries: z.array(z.strictObject({ soc_code: z.string(), summary: z.string() })),
});

/** One career in the response: a checked summary, or its first core tasks. */
export type CareerSummary = { soc_code: string; source: Source | null } & (
  | { kind: "summary"; summary: string }
  | { kind: "tasks"; tasks: string[] }
);
