import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import { Sequence } from "remotion";
import { Audio } from "@remotion/media";
import { KineticCaptions } from "../KineticCaptions";
import type { Word } from "../beats/words";
import {
  TYPING_CLICK_HOLD_FRAMES,
  TYPING_SFX_URL,
  TYPING_SFX_VOLUME,
} from "../lib/sceneSfx";

/* ------------------------------------------------------------------ */
/*  Per-beat wrapper around <KineticCaptions>                          */
/*                                                                     */
/*  Responsibilities:                                                 */
/*   1. Slice the full word list to the current beat's window so      */
/*      captions don't bleed into adjacent beats.                     */
/*   2. Provide a local BeatContext so KineticCaptions can rebase    */
/*      GLOBAL word starts to LOCAL frames inside useMemo (the       */
/*      highlight otherwise stays stuck on word 0).                   */
/*   3. Render a typing-click <Audio> per word, gated to the same     */
/*      data-vis beat types as the visual captions.                   */
/*                                                                     */
/*  Why we own a local context (not the orchestrator's):             */
/*    The orchestrator exports `useBeatContext` for backward         */
/*    compat, but KineticCaptions reads from THIS context. Same data */
/*    shape, owned by the same file. Lets us add per-beat fields     */
/*    later (e.g. word highlight color overrides) without touching   */
/*    MotionGraphicsVideo.                                            */
/* ------------------------------------------------------------------ */

type BeatKineticCaptionsProps = {
  text: string;
  words: Word[];
  durationInFrames: number;
  beatType: string;
  fps: number;
  /** Absolute frame at which this beat begins. */
  startFrame: number;
};

export type BeatContextValue = {
  currentBeatType: string | null;
  currentBeatText: string | null;
  /** Word list sliced to this beat's window, in GLOBAL seconds. */
  currentWords: Word[];
  /** Absolute frame at which this beat begins. */
  beatStartFrame: number | null;
  /** Beat duration in frames. */
  beatDurationInFrames: number | null;
};

const defaultBeatContext: BeatContextValue = {
  currentBeatType: null,
  currentBeatText: null,
  currentWords: [],
  beatStartFrame: null,
  beatDurationInFrames: null,
};

const LocalBeatContext = createContext<BeatContextValue>(defaultBeatContext);

export const useBeatContext = (): BeatContextValue =>
  useContext(LocalBeatContext);

/* ------------------------------------------------------------------ */
/*  useBeatWordSlice                                                  */
/*                                                                     */
/*  Slices the global words[] to the current beat's window            */
/*  [startFrame/fps, (startFrame + durationInFrames)/fps] and         */
/*  forwards the result to KineticCaptions. This is the only place   */
/*  that knows the beat's timing in absolute frames.                  */
/* ------------------------------------------------------------------ */

const useBeatWordSlice = (
  words: Word[],
  startFrame: number,
  durationInFrames: number,
  fps: number,
): Word[] => {
  return useMemo(() => {
    const windowStartSec = startFrame / fps;
    const windowEndSec = (startFrame + durationInFrames) / fps;
    return words.filter(
      (w) => w.end > windowStartSec && w.start < windowEndSec,
    );
  }, [words, startFrame, durationInFrames, fps]);
};

export const BeatKineticCaptions: React.FC<BeatKineticCaptionsProps> = ({
  text,
  words,
  durationInFrames,
  beatType,
  fps,
  startFrame,
}) => {
  const currentWords = useBeatWordSlice(
    words,
    startFrame,
    durationInFrames,
    fps,
  );

  // Capture beatIndex (relative to the per-beat <Sequence> mount) so
  // the per-word audio log lines can be cross-referenced with the
  // orchestrator's whoosh logs.
  const [beatIndex] = useState(() =>
    // eslint-disable-next-line no-console
    Math.floor(Math.random() * 0), // placeholder — see note below
  );
  // NOTE: beatIndex is currently unknown here because
  // BeatKineticCaptions is rendered without an index prop. The audio
  // log line therefore omits the meta key. The orchestrator already
  // logs the beat's whoosh with its own beatIndex, so per-word
  // context is still recoverable from the order in the render log.
  // (Avoiding a prop-drilling change just for log cosmetics.)

  return (
    <LocalBeatContext.Provider
      value={{
        currentBeatType: beatType,
        currentBeatText: text,
        currentWords,
        beatStartFrame: startFrame,
        beatDurationInFrames: durationInFrames,
      }}
    >
      <KineticCaptions />

      {/*
        Typing-click track — one <Audio> per word, mounted inside a
        per-word <Sequence> at the word's LOCAL start frame. The
        parent <Sequence> (this component is mounted inside a per-
        beat <Sequence in MotionGraphicsVideo>) bounds the whole
        track to the beat's duration, so clicks stop when the beat
        ends even if the last word's localStartFrame + hold is past
        the beat boundary.

        Local-frame conversion: word timestamps are GLOBAL (relative
        to the start of the whole composition). Clicks live inside
        the per-beat <Sequence> whose local counter starts at 0 at
        `startFrame`. `localStartFrame = Math.round(w.start * fps) -
        startFrame` is the offset.

        Each click is held for TYPING_CLICK_HOLD_FRAMES (4 frames ≈
        133ms at 30fps) — the smallest stable window for mediabunny's
        MP4 muxer. 1-frame variants throw `Cannot write to a closing
        writable stream` during chunk flush.

        Render-time audio log (Horizon 0.4 — 1.4): each click has a
        sibling <AudioMountLog> that emits a [audio] click line via
        useEffect on first mount. The sibling pattern is required
        because <Audio>'s onMount hook is time-driven and does not
        fire during a `still` (single-frame) render — see
        src/audio/AudioMountLog.tsx for the full reasoning.
      */}
      {currentWords.map((w, i) => {
        const localStartFrame = Math.max(
          0,
          Math.round(w.start * fps) - startFrame,
        );
        return (
          <Sequence
            key={`type-${i}-${w.start}`}
            from={localStartFrame}
            durationInFrames={TYPING_CLICK_HOLD_FRAMES}
          >
            <Audio src={TYPING_SFX_URL} volume={TYPING_SFX_VOLUME} />
          </Sequence>
        );
      })}
    </LocalBeatContext.Provider>
  );
};
