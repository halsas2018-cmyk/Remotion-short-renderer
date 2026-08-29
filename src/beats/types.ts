import { z } from "zod";
import { getBeatSchemas, validateBeatMetadata } from "./registry";

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
  | "quote_card"
  | "headline_card";

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
/*  We forward the per-type Zod issues into the parent context so the */
/*  error message preserves the underlying field path (e.g.          */
/*  `beats[1].icon: expected string, got undefined`) instead of       */
/*  a generic "custom" issue with a useless `path: ["metadata"]`.     */
/*                                                                     */
/*  IMPORTANT: The top-level `z.object(beatBaseShape)` uses          */
/*  `.passthrough()` so that per-type fields (icon, left, right,      */
/*  events, steps, etc.) are NOT stripped before the per-type        */
/*  schema sees them. Without `.passthrough()`, Zod's default        */
/*  `z.object` strips unknown keys, and the per-type validation      */
/*  would always fail on the first per-type field it tries to read.  */
/* ------------------------------------------------------------------ */

const beatBaseShape = {
  type: z.string(),
  text: z.string(),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  endFrame: z.number().int().nonnegative().optional(),
};

/**
 * The schema for ONE beat. Reads the `type` field and dispatches to
 * the matching per-type schema in the registry.
 *
 * If the per-type schema has issues, we re-emit them under the same
 * `path` (offset by the array index) so the final user-facing error
 * looks like: `beats[1].icon: expected string, got undefined`.
 */
const PerBeatSchema = z
  .object(beatBaseShape)
  .passthrough()
  .superRefine((beat, ctx) => {
    // Dispatch to the per-type schema. Use safeParse so we can introspect
    // the individual issues and preserve their original `path`.
    const schemas = getBeatSchemas(beat.type as BeatType);
    if (!schemas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: `unknown beat type "${beat.type}". Add a registry entry in src/beats/registry.ts.`,
      });
      return;
    }

    const result = schemas.beatSchema.safeParse(beat);
    if (result.success) return;

    // Re-emit each underlying issue under the same `path` relative to
    // the array element. Since the per-type schema validates the WHOLE
    // beat object (top-level), the paths in `result.error.issues` are
    // already relative to the beat. We forward them verbatim — the
    // parent `z.array()` validation will prepend `beats[i]` automatically.
    for (const issue of result.error.issues) {
      ctx.addIssue({
        ...issue,
        // Strip any leading "metadata." prefix from the issue path.
        // The old design added `path: ["metadata"]`; the new design
        // forwards the real path so users see `beats[1].icon` instead of
        // `beats[1].metadata`.
        path: issue.path.map((p) =>
          p === "metadata" ? [] : p,
        ) as (string | number)[],
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
