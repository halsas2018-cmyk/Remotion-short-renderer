import React, { useEffect, useRef } from "react";
import { Sequence } from "remotion";
import { Audio } from "@remotion/media";
import { KineticCaptions } from "../KineticCaptions";
import type { Word } from "../beats/words";
import { TYPING_SFX_URL, TYPING_SFX_VOLUME } from "../lib/sceneSfx";

/**
 * Per-beat wrapper around the existing <KineticCaptions> component.
 *
 * The orchestrator (MotionGraphicsVideo) renders this inside a
 * per-beat <Sequence from={startFrame} durationInFrames=...>. That
 * means the LOCAL `useCurrentFrame()` inside this wrapper is 0 at
 * the start of the beat and counts up to `durationInFrames` at the
 * end of the beat.
 *
 * Two responsibilities:
 *   1) Slice the full word list to the current beat's window, so
 *      KineticCaptions' word highlight stays inside this beat
 *      instead of jumping across the whole composition.
 *   2) Provide the beat context (currentBeatType, currentWords,
 *      beatStartFrame, beatDurationInFrames) so KineticCaptions
 *      can map the per-beat LOCAL frame counter against the
 *      re-based per-word LOCAL frame numbers.
 *
 * Typing SFX:
 *   In addition to the visual captions, this wrapper also renders
 *   one short <Audio> click per word, placed at the word's start
 *   frame inside the beat's LOCAL timeline. The clicks are bounded
 *   to the beat's <Sequence> by the parent Sequence, so they
 *   automatically stop at the end of the beat. Volume is kept low
 *   (0.15) so the click track doesn't fight the narration or the
 *   cross-fade whoosh.
 *
 *   IMPORTANT:
 *     - Each click lives in a 4-frame <Sequence>, NOT a 1-frame one.
 *       The 1-frame variant caused mediabunny's MP4 muxer to throw
 *       `Cannot write to a closing writable stream` during chunk
 *       flush. 4 frames is enough for mediabunny to read the WAV
 *       samples and produce a well-formed audio chunk while still
 *       feeling snappy.
 *     - Word timestamps from WhisperX are GLOBAL (relative to the
 *       start of the whole composition), but the click is mounted
 *       inside a per-beat <Sequence> whose local frame counter starts
 *       at 0 at the beat's `startFrame`. We therefore offset each
 *       word's start by `startFrame` (in frames) to convert it to
 *       the local timeline. Without this, the click would lag the
 *       narration by `startFrame` frames.
 */
type BeatKineticCaptionsProps = {
  text: string;
  words: Word[];
  durationInFrames: number;
  beatType: string;
  fps: number;
  /** Absolute frame at which this beat begins. */
  startFrame: number;
};

import { createContext, useContext, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Beat context — exported so KineticCaptions can read it via hook.  */
/*  We expose this from BeatKineticCaptions rather than from           */
/*  MotionGraphicsVideo so the two halves of the captions system      */
/*  (per-beat wrapper + visual renderer) are owned by the same file.  */
/*                                                                     */
/*  MotionGraphicsVideo's existing `useBeatContext` continues to      */
/*  exist for backward compatibility but KineticCaptions now uses     */
/*  this local one — the values are equivalent (same data shape).     */
/* ------------------------------------------------------------------ */

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

const BeatContext = createContext<BeatContextValue>(defaultBeatContext);

/**
 * Hook for child components (KineticCaptions) to read the per-beat
 * context provided by BeatKineticCaptions.
 */
export const useBeatContext = (): BeatContextValue => useContext(BeatContext);

export const BeatKineticCaptions: React.FC<BeatKineticCaptionsProps> = ({
  text,
  words,
  durationInFrames,
  beatType,
  fps,
  startFrame,
}) => {
  // ============================================
  // Slice the word list to this beat's window.
  // ============================================
  // The Python pipeline emits a SINGLE global timestamps.json for
  // the whole narration. We need just the words spoken during
  // THIS beat. Use a 10ms pre-roll buffer on the start so a word
  // that begins exactly at the beat boundary is included.
  const startSec = startFrame / fps - 0.01;
  const endSec = (startFrame + durationInFrames) / fps;
  const beatWords: Word[] = words.filter(
    (w) => w.start >= startSec && w.start < endSec,
  );

  // Provide the per-beat context. We hold the value in state so it
  // survives a parent re-render that swaps `words` references (the
  // orchestrator passes a stable `allWords` array, but if it ever
  // re-fetches and produces a new array, the captions will update
  // without remounting).
  const [ctx, setCtx] = useState<BeatContextValue>(defaultBeatContext);
  const lastDeps = useRef<string>("");
  useEffect(() => {
    const depsKey = `${beatType}|${startFrame}|${durationInFrames}|${beatWords.length}|${text}`;
    if (depsKey !== lastDeps.current) {
      lastDeps.current = depsKey;
      setCtx({
        currentBeatType: beatType,
        currentBeatText: text,
        currentWords: beatWords,
        beatStartFrame: startFrame,
        beatDurationInFrames: durationInFrames,
      });
    }
  }, [beatType, text, beatWords, startFrame, durationInFrames]);

  // One-time log on mount so you can confirm in the render log that
  // the words list reached this beat.
  const hasLogged = useRef(false);
  if (!hasLogged.current) {
    // eslint-disable-next-line no-console
    console.log(
      `[BeatKineticCaptions] beat=${beatType} startFrame=${startFrame} ` +
        `durationInFrames=${durationInFrames} fps=${fps} ` +
        `words.length=${beatWords.length} text="${text.slice(0, 40)}${text.length > 40 ? "…" : ""}"`,
    );
    hasLogged.current = true;
  }

  return (
    <BeatContext.Provider value={ctx}>
      <KineticCaptions
        captionEnabledTypes={new Set([beatType])}
        beats={[]}
        words={beatWords}
      />

      {/*
        One short <Sequence> per word, mounted at the word's start
        frame inside this beat's LOCAL timeline. The local frame is
        `w.start * fps - startFrame`, where `w.start` is the global
        word start in seconds and `startFrame` is the absolute frame
        at which this beat begins.

        Each <Sequence> contains a single <Audio> click. The Sequence
        runs for CLICK_HOLD_FRAMES frames so mediabunny can flush a
        clean audio chunk; the audio file itself is a short blip and
        stops on its own well within that window.
      */}
      {beatWords.map((w, i) => {
        const localStartFrame = Math.max(
          0,
          Math.round(w.start * fps) - startFrame,
        );
        return (
          <Sequence
            key={`type-${i}-${w.start}`}
            from={localStartFrame}
            durationInFrames={CLICK_HOLD_FRAMES}
          >
            <Audio src={TYPING_SFX_URL} volume={TYPING_SFX_VOLUME} />
          </Sequence>
        );
      })}
    </BeatContext.Provider>
  );
};

/**
 * Number of frames each typing-click <Sequence> stays mounted.
 *
 * Why 4 frames?
 *   1 frame: too few audio samples for mediabunny's MP4 interleaver to
 *            commit cleanly → "Cannot write to a closing writable stream"
 *            during _flush.
 *   2-3 frames: still flaky in the same way; the chunk size is so small
 *            the muxer can't write it before the target closes.
 *   4 frames: stable. Mediabunny reads the WAV samples and emits a
 *            well-formed chunk. ≈133ms at 30fps — still snappy, still
 *            feels like a discrete click, and well under the time the
 *            word is on screen.
 */
const CLICK_HOLD_FRAMES = 4;
