import { z } from "zod";
import { validateBeatMetadata } from "./registry";

/* ------------------------------------------------------------------ */
/*  BeatType — union of every supported beat type.                     */
/* ------------------------------------------------------------------ */

export type BeatType =
  | "key_statement"
  | "plain_text"
  | "icon_text"
  | "chart_line"
  | "chart_counter"
  | "chart_comparison"
  | "chart_comparison_3d"
  | "progress_meter"
  | "timeline"
  | "versus"
  | "before_after"
  | "map_location"
  | "map_3d"
  | "process_flow"
  | "quote_card";

/* ------------------------------------------------------------------ */
/*  Beat — runtime shape of a single beat.                            */
/*                                                                     */
/*  The Python pipeline puts per-type fields (e.g. `emphasisWords`,  */
/*  `icon`, `left`, `right`, `events`, `steps`) at the **top level** */
/*  of each beat object, NOT inside a nested `metadata` field. The   */
/*  orchestrator passes the whole beat object to the per-type        */
/*  validator.                                                         */
/*                                                                     */
/*  We keep the type loose here so the Python pipeline can evolve     */
/*  without TypeScript errors. The strict validation happens at      */
/*  runtime in `src/beats/registry.ts` via Zod.                       */
/* ------------------------------------------------------------------ */

export type Beat = {
  type: BeatType;
  /** Narration text for this beat (top-level). */
  text: string;
  startFrame: number;
  durationInFrames: number;
  /** Optional. Some beat types have an explicit endFrame; ignored if present. */
  endFrame?: number;
  /** Per-type props live as additional top-level fields on each beat.
   * We keep the type loose here and validate per-type in the registry. */
  [key: string]: unknown;
};

export type TimedBeats = {
  fps: number;
  totalDurationInFrames: number;
  beats: Beat[];
};

/* ------------------------------------------------------------------ */
/*  Word — runtime shape of a single WhisperX timestamp.               */
/* ------------------------------------------------------------------ */

export const WordSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

export type Word = z.infer<typeof WordSchema>;

/* ------------------------------------------------------------------ */
/*  Per-beat Zod schema                                                */
/*                                                                     */
/*  A beat is one element of `beats.json`'s `beats[]` array. The      */
/*  top-level fields (`type`, `text`, `startFrame`, `durationInFrames`*/
/*  `endFrame?`) are always present, and the per-type fields are     */
/*  validated against the registered schema in `src/beats/registry.ts`*/
/*                                                                     */
/*  We use Zod's `discriminatedUnion` so a malformed beat (e.g.      */
/*  `type=key_statement` but `emphasisWords=42`) is caught with a    */
/*  clear error like `beats[3].emphasisWords must be an array, got   */
/*  number` instead of a render-time crash deep inside KeyStatement. */
/* ------------------------------------------------------------------ */

/**
 * The schema for ONE beat. Reads the `type` field and dispatches to
 * the matching per-type schema in the registry.
 *
 * Throws if `type` is unknown (no registry entry). The error message
 * lists the unknown type and the valid alternatives.
 */
const PerBeatSchema = z.object({
  type: z.string(),
  text: z.string(),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  endFrame: z.number().int().nonnegative().optional(),
}).superRefine((beat, ctx) => {
  // Dispatch to the per-type schema. If it throws, Zod wraps the
  // error in a ZodError with a clean `path` we can surface in the
  // [MotionGraphicsVideo] error message.
  try {
    validateBeatMetadata(beat.type as BeatType, beat);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : `unknown schema validation failure for type "${beat.type}"`;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["metadata"],
      message,
    });
  }
});

/**
 * Top-level `beats.json` schema.
 *
 * This is what `Root.tsx::renderDataCalculateMetadata` parses
 * `public/beats.json` against. It replaces the loose
 * `TimedBeatsSchema` that lived in `Root.tsx` and only checked
 * `fps` / `totalDurationInFrames` / `beats` (with `z.unknown()`).
 */
export const TimedBeatsSchema = z.object({
  fps: z.number().int().positive(),
  totalDurationInFrames: z.number().int().nonnegative(),
  beats: z.array(PerBeatSchema).min(1),
});

/**
 * `timestamps.json` schema.
 *
 * Validated with a per-word Zod schema. Per-word dedupe of
 * overlapping / zero-duration words is NOT done here — it lands in
 * Horizon 0.3 (1.3). For now we just check shape.
 */
export const WordListSchema = z.array(WordSchema).nonempty();
