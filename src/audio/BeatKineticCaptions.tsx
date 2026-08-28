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
 *   short <Audio> click per word, placed at the word's start frame.
 *   The clicks are bounded to the beat's <TransitionSeries.Sequence> by
 *   the parent Sequence, so they automatically stop at the end of the
 *   beat. Volume is kept low (0.15) so the click track doesn't fight
 *   the narration or the cross-fade whoosh.
 */
type BeatKineticCaptionsProps = {
  text: string;
  words: Word[];
  durationInFrames: number;
  beatType: string;
  fps: number;
};

export const BeatKineticCaptions: React.FC<BeatKineticCaptionsProps> = ({
  words,
  beatType,
  fps,
}) => {
  return (
    <>
      <KineticCaptions
        captionEnabledTypes={new Set([beatType])}
        beats={[]}
        words={words}
      />

      {/*
        One short <Sequence> per word, mounted at the word's start frame
        inside this beat's local timeline. Each contains a single
        <Audio> click. We use a 1-frame <Sequence> so the click fires
        at the word's start; the audio itself is a short blip and stops
        on its own.
      */}
      {words.map((w, i) => {
        const wordStartFrame = Math.max(0, Math.round(w.start * fps));
        return (
          <Sequence
            key={`type-${i}-${w.start}`}
            from={wordStartFrame}
            durationInFrames={1}
          >
            <Audio src={TYPING_SFX_URL} volume={TYPING_SFX_VOLUME} />
          </Sequence>
        );
      })}
    </>
  );
};
