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

export type BeatMetadata = Record<string, unknown>;

export type Beat = {
  type: BeatType;
  startFrame: number;
  durationInFrames: number;
  metadata: BeatMetadata;
};

export type TimedBeats = {
  fps: number;
  totalDurationInFrames: number;
  beats: Beat[];
};
