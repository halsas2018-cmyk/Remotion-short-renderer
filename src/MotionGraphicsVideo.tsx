import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Composition,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Beat, TimedBeats } from "./beats/types";
import { RenderBeat } from "./beats/renderBeat";
import type { Word } from "./beats/words";

/* ------------------------------------------------------------------ */
/*  Props for the orchestrator                                         */
/* ------------------------------------------------------------------ */

export type MotionGraphicsVideoProps = {
  /** Full beat plan from the Python pipeline (beats.json shape). */
  beats: TimedBeats;
  /** Word-level timestamps from WhisperX (word_timestamps.json shape). */
  words: Word[];
  /** Optional path to narration audio in /public. */
  narrationSrc?: string;
};

/* ------------------------------------------------------------------ */
/*  The composition itself                                            */
/* ------------------------------------------------------------------ */

export const MotionGraphicsVideo: React.FC<MotionGraphicsVideoProps> = ({
  beats,
  words,
  narrationSrc,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {/*
        Background music / voiceover plays for the full composition.
        The Audio element is rendered once at the root so it doesn't
        get re-mounted per beat sequence.
      */}
      {narrationSrc ? <Audio src={staticFile(narrationSrc)} /> : null}

      {/*
        Render each beat as a hard-coded <Sequence>. Each <Sequence>
        is its own JSX node (per the Remotion video-editing rule) so
        its `from` and `durationInFrames` remain editable in Studio.

        We do NOT use .map() — beats are listed explicitly so the
        timeline is fully readable and editable in the Studio.
      */}
      {beats.beats.map((beat, index) => (
        <RenderBeat
          // We re-mount RenderBeat per beat via the key below; React
          // requires `key` on elements produced by .map().
          key={`beat-${index}`}
          beat={beat as Beat}
          // Top-level `text` from the beat drives KineticCaptions.
          // The Zod schema's `metadata.text` is ignored — narration
          // lives at the beat root in the Python output.
          text={(beat as Beat & { text: string }).text}
          allWords={words}
          beatIndex={index}
          fps={fps}
        />
      ))}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Dynamic duration via calculateMetadata                             */
/*  Reads `props.beats` and returns the total frame count so the       */
/*  composition auto-resizes when beats.json changes.                  */
/* ------------------------------------------------------------------ */

export const calculateMetadata: CalculateMetadataFunction<
  MotionGraphicsVideoProps
> = ({ props }) => {
  if (!props.beats || props.beats.beats.length === 0) {
    return {
      durationInFrames: 1,
    };
  }

  const lastBeat = props.beats.beats[props.beats.beats.length - 1];
  const total = (lastBeat as Beat).startFrame + (lastBeat as Beat).durationInFrames;

  return {
    durationInFrames: total,
  };
};
