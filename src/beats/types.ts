import { z } from "zod";
import { getBeatSchemas } from "./registry";

/* ------------------------------------------------------------------ */
/*  BeatType — every supported beat type in the library.              */
/*  Add a new union member + a registry entry to introduce a new     */
/*  beat type.                                                       */
/* ------------------------------------------------------------------ */
export const BeatType = [
  "key_statement",
  "headline_card",
  "plain_text",
  "icon_text",
  "chart_line",
  "chart_counter",
  "chart_comparison_3d",
  "progress_meter",
  "timeline",
  "versus",
  "before_after",
  "map_3d",
  "process_flow",
  "quote_card",
  "stat_pill",          // 2.1.2
  "quote_attribution",  // 2.1.3
  "compare_split",      // 2.1.4
  "location_pulse",     // 2.1.5
  "scrollytelling",     // 2.1.6
  "ticker_tape",        // 2.1.7
] as const;
export type BeatType = (typeof BeatType)[number];

/* ------------------------------------------------------------------ */
/*  Base beat shape — every beat has these fields.                    */
/*  Per-type fields are validated by the registry's per-type         */
/*  Zod schema (see `PerBeatSchema` below).                          */
/* ------------------------------------------------------------------ */
const beatBaseShape = {
  type: z.string(),
  startFrame: z.number().nonnegative(),
  endFrame: z.number().nonnegative().optional(),
  durationInFrames: z.number().positive(),
  // Horizon 3.4: per-beat pacing hint. Read by the orchestrator to
  // adjust durationInFrames by ±20% ("fast" = shorter, "slow" = longer).
  pacing: z.enum(["slow", "normal", "fast"]).optional(),
};

export const PerBeatSchema = z
  .object(beatBaseShape)
  // .passthrough() is load-bearing — without it Zod strips unknown keys
  // before the per-type schema sees them, and per-type fields
  // (icon, left, right, events, steps, etc.) are silently missing.
  .passthrough()
  .superRefine((beat, ctx) => {
    const type = beat.type as BeatType;
    const { beatSchema } = getBeatSchemas(type);
    if (!beatSchema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: `unknown beat type "${beat.type}". Add a registry entry in src/beats/registry.ts.`,
      });
      return;
    }
    const result = beatSchema.safeParse(beat);
    if (!result.success) {
      // Forward the underlying issues so the user sees the original field path
      // (e.g. ["icon"] → "beats[1].icon: Invalid input") rather than a
      // generic opaque "metadata" message.
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: issue.path,
        });
      }
    }
  });

export const TimedBeatsSchema = z.object({
  fps: z.number().positive(),
  totalDurationInFrames: z.number().positive(),
  beats: z.array(PerBeatSchema).min(1),
});

export type TimedBeats = z.infer<typeof TimedBeatsSchema>;
export type Beat = TimedBeats["beats"][number];

/* ------------------------------------------------------------------ */
/*  Word timestamp schema (for public/timestamps.json).               */
/* ------------------------------------------------------------------ */
export const WordSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});
export const WordListSchema = z.array(WordSchema).nonempty();
export type Word = z.infer<typeof WordSchema>;
