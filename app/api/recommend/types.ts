/**
 * Shape of the POST /api/recommend response. Client-safe (no server-only
 * imports) so the quiz can validate what it receives before using it.
 *
 * The response carries career codes, selection labels, the student's matched
 * values and interest letters, any Q9 avoid flags the career hits, and Stage 2
 * summaries. It never carries the ZIP or income. The only answer text it can
 * echo is the Q1 job, inside dream_job_label.
 */
import { z } from "zod";
import { InterestTagSchema, WorkValueSchema } from "@/lib/extract/schema";

const SocSchema = z.string().regex(/^\d{2}-\d{4}$/);

const SourceSchema = z.object({
  source: z.string(),
  data_vintage: z.string().nullable(),
  source_url: z.string().nullable(),
});

const SummarySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("summary"), soc_code: SocSchema, summary: z.string(), source: SourceSchema.nullable() }),
  z.object({ kind: z.literal("tasks"), soc_code: SocSchema, tasks: z.array(z.string()), source: SourceSchema.nullable() }),
]);

export const SlotSchema = z.enum(["direct", "two_year", "adjacent", "real_path", "closest_match", "short_training"]);

const RecommendedCardSchema = z.object({
  soc: SocSchema,
  slot: SlotSchema,
  dream_job_label: z.object({ heading: z.string(), note: z.string() }).nullable(),
  /** The student's values this career scored on, strongest first, at most 2. */
  matched_values: z.array(WorkValueSchema).max(2),
  /** The student's RIASEC letters that appear in this career's code, in the student's order. */
  matched_interests: z.array(InterestTagSchema),
  /** Q9 avoid flags this career hits. Only keys of AVOID_TABLE, never the student's typed text. */
  avoid_hits: z.array(z.string()),
  summary: SummarySchema,
});

export const RecommendResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("nudge"), message: z.string() }),
  z.object({
    kind: z.literal("cards"),
    mode: z.enum(["standard", "conflict"]),
    cards: z.tuple([RecommendedCardSchema, RecommendedCardSchema, RecommendedCardSchema]),
  }),
]);

export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;
export type RecommendedCard = z.infer<typeof RecommendedCardSchema>;
export type CardSummary = RecommendedCard["summary"];
export type Slot = z.infer<typeof SlotSchema>;
