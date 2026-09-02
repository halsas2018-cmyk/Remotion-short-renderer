import React from "react";
import { Beat } from "./types";
import { SceneTransition } from "../SceneTransition";
import {
  getBeatComponent,
  validateBeatMetadata,
  isBeatTypeSupported,
} from "./registry";
import { adaptMetadata } from "./adaptMetadata";
import type { Word } from "./words";

/* ------------------------------------------------------------------ */
/*  Kinetic captions gate                                             */
/*                                                                     */
/*  Only data-vis beat types show word-sync captions on top of the   */
/*  visual. Text/card heavy beat types already show the spoken text  */
/*  on-screen, so adding captions would be redundant.                */
/*                                                                     */
/*  Show:  map_3d, chart_line, chart_comparison_3d, chart_counter,    */
/*         progress_meter, timeline, process_flow                     */
/*  Hide:  key_statement, plain_text, icon_text, versus, before_after, */
/*         quote_card                                                 */
/*                                                                     */
/*  process_flow is included: it reuses the Timeline component        */
/*  (see registry.ts comment) and is functionally a data-vis beat —   */
/*  the on-screen steps[] are short labels, not the spoken text, so   */
/*  the spoken text would otherwise be invisible.                     */
/* ------------------------------------------------------------------ */

export const CAPTION_VISIBLE_BEAT_TYPES = new Set<string>([
  "map_3d",
  "chart_line",
  "chart_comparison_3d",
  "chart_counter",
  "progress_meter",
  "timeline",
  "process_flow",
]);

export const shouldShowKineticCaptions = (beatType: string): boolean =>
  CAPTION_VISIBLE_BEAT_TYPES.has(beatType);

/* ------------------------------------------------------------------ */
/*  BeatContent                                                       */
/*                                                                     */
/*  IMPORTANT: This component renders the CONTENT of a single beat — */
/*  it does NOT wrap itself in <TransitionSeries.Sequence>. The      */
/*  caller (MotionGraphicsVideo) is responsible for the wrapper,     */
/*  because <TransitionSeries> only accepts literal                   */
/*  <TransitionSeries.Sequence> / <TransitionSeries.Transition> /     */
/*  <TransitionSeries.Overlay> elements as direct children.           */
/*                                                                     */
/*  The component handles:                                            */
/*    1) Validating the beat metadata (Zod)                           */
/*    2) Adapting the top-level Python shape into the rich shape the */
/*       existing components expect                                   */
/*    3) Looking up the registered component                         */
/*    4) Slicing the word list to this beat's window                  */
/*    5) Rendering either the real component OR an inline fallback   */
/*       message inside a <SceneTransition>                           */
/*                                                                     */
/*  The caller separately renders <BeatKineticCaptions> as a sibling */
/*  inside the <TransitionSeries.Sequence> (only for data-vis beats).*/
/* ------------------------------------------------------------------ */

type BeatContentProps = {
  beat: Beat;
  allWords: Word[];
  beatIndex: number;
  fps: number;
  /**
   * Cross-fade window (in frames) shared with the next beat. When set, the
   * SceneTransition's exit fade runs across the LAST `crossFadeFrames`
   * frames of the beat instead of the 18% default, so the outgoing beat
   * fades in lockstep with the incoming beat's entrance.
   *
   * Pass 0 for the last beat (no next beat to cross-fade into) — the
   * SceneTransition falls back to the 18% default end fade in that case.
   */
  crossFadeFrames?: number;
};

export const BeatContent: React.FC<BeatContentProps> = ({
  beat,
  allWords,
  fps,
  crossFadeFrames,
}) => {
  // 1) Validate metadata
  let validatedBeat: Record<string, unknown>;
  try {
    validatedBeat = validateBeatMetadata(beat.type, beat) as Record<
      string,
      unknown
    >;
  } catch (err) {
    return (
      <SceneTransition crossFadeFrames={crossFadeFrames}>
        <InvalidBeatMessage
          beatType={beat.type}
          text={beat.text}
          error={err instanceof Error ? err.message : String(err)}
        />
      </SceneTransition>
    );
  }

  // 2) Adapt top-level Python shape to component shape
  const adaptedProps = adaptMetadata(beat.type, validatedBeat);

  // 3) Look up the component
  const BeatComponent = getBeatComponent(beat.type);

  if (!BeatComponent || !isBeatTypeSupported(beat.type)) {
    return (
      <SceneTransition crossFadeFrames={crossFadeFrames}>
        <UnsupportedBeatMessage beatType={beat.type} text={beat.text} />
      </SceneTransition>
    );
  }

  return (
    <SceneTransition crossFadeFrames={crossFadeFrames}>
      <BeatComponent
        {...adaptedProps}
        durationInFrames={beat.durationInFrames}
      />
    </SceneTransition>
  );
};

/* ------------------------------------------------------------------ */
/*  Inline fallback messages for bad / missing beat data              */
/* ------------------------------------------------------------------ */

const InvalidBeatMessage: React.FC<{
  beatType: string;
  text: string;
  error: string;
}> = ({ beatType, text, error }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#fee",
      color: "#900",
      padding: 48,
      textAlign: "center",
      fontFamily: "sans-serif",
    }}
  >
    <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
      Invalid metadata for "{beatType}"
    </div>
    <div style={{ fontSize: 18, fontStyle: "italic", marginBottom: 12 }}>
      {text}
    </div>
    <div style={{ fontSize: 16, opacity: 0.8 }}>{error}</div>
  </div>
);

const UnsupportedBeatMessage: React.FC<{
  beatType: string;
  text: string;
}> = ({ beatType, text }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#eef",
      color: "#003",
      padding: 48,
      textAlign: "center",
      fontFamily: "sans-serif",
    }}
  >
    <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
      No component registered for "{beatType}"
    </div>
    <div style={{ fontSize: 20, fontStyle: "italic" }}>{text}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Word slicing helper                                               */
/* ------------------------------------------------------------------ */

/**
 * Slice the full word list to just the words in this beat's window.
 * Used by MotionGraphicsVideo when deciding whether to render
 * <BeatKineticCaptions> for a beat.
 */
export const sliceWordsForBeat = (
  allWords: Word[],
  startFrame: number,
  durationInFrames: number,
  fps: number,
): Word[] => {
  const startSec = startFrame / fps;
  const endSec = (startFrame + durationInFrames) / fps;
  return allWords.filter(
    (w) => w.start >= startSec - 0.001 && w.start < endSec,
  );
};

/* ------------------------------------------------------------------ */
/*  Re-export the captions gate from the orchestrator's perspective   */
/*                                                                     */
/*  The orchestrator (MotionGraphicsVideo) imports this and calls     */
/*  it per-beat to decide whether to mount <BeatKineticCaptions>.     */
/*  We re-export `shouldShowKineticCaptions` so the same set is the   */
/*  single source of truth on both sides.                             */
/* ------------------------------------------------------------------ */

export { shouldShowKineticCaptions as shouldShowCaptions };
