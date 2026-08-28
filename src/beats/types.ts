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

/**
 * A beat in the timed-beats plan produced by the Python pipeline.
 *
 * NOTE: The Python pipeline puts per-type fields (e.g. `emphasisWords`,
 * `icon`, `left`, `right`, `events`, `steps`) at the **top level** of
 * each beat object, NOT inside a nested `metadata` field. The orchestrator
 * picks the relevant fields per beat type when calling Zod and the
 * inner component.
 */
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
