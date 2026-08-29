import React from "react";
import { Sequence } from "remotion";
import { Audio } from "@remotion/media";
import { KineticCaptions } from "../KineticCaptions";
import type { Word } from "../beats/words";
import { TYPING_SFX_URL, TYPING_SFX_VOLUME } from "../lib/sceneSfx";

/**
 * Per-beat wrapper around the existing <KineticCaptions> component.
 *
 * The original <KineticCaptions> takes a `captionEnabledTypes` set,
 * a `beats` array, and a `words` array (all words). For the orchestrator
 * we already pre-slice the words to the current beat's window, so we
 * can short-circuit: pass an empty beats array and a `Set([beatType])`
 * with just the current beat's type enabled.
 *
 * This avoids changing the KineticCaptions contract until you decide
 * to refactor it.
 *
 * Typing SFX:
 *   In addition to the visual captions, this wrapper also renders one
 *   short <Audio> click per word, placed at the word's start frame
 *   inside the beat's local timeline. The clicks are bounded to the
 *   beat's <Sequence> by the parent Sequence, so they automatically
 *   stop at the end of the beat. Volume is kept low (0.15) so the
 *   click track doesn't fight the narration or the cross-fade whoosh.
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
  /** Absolute frame at which this beat begins. Subtracted from each
   * word's global start so the click lines up with the audio. */
  startFrame: number;
};

export const BeatKineticCaptions: React.FC<BeatKineticCaptionsProps> = ({
  words,
  beatType,
  fps,
  startFrame,
}) => {
  return (
    <>
      <KineticCaptions
        captionEnabledTypes={new Set([beatType])}
        beats={[]}
        words={words}
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
      {words.map((w, i) => {
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
    </>
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
