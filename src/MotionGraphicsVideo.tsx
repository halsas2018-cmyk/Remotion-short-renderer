import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
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
        Narration plays once for the whole composition. Mounted at the
        root so it isn't re-mounted per beat.
      */}
      {narrationSrc ? <Audio src={staticFile(narrationSrc)} /> : null}

      {/*
        Render each beat as a hard-coded <Sequence>. Each <Sequence>
        is its own JSX node (per the Remotion video-editing rule) so
        its `from` and `durationInFrames` are editable in Studio.

        The .map() iterates over the *data* (beats.beats), not over
        the JSX tree. The JSX tree per beat is hardcoded inside
        <RenderBeat>, so each beat is fully editable in Studio.
      */}
      {beats.beats.map((beat, index) => (
        <RenderBeat
          key={`beat-${index}`}
          // `RenderBeat` reads top-level `text` from the beat itself
          // (no need to pass it as a separate prop).
          beat={beat as Beat & { text: string }}
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
/* ------------------------------------------------------------------ */

export const calculateMetadata: CalculateMetadataFunction<
  MotionGraphicsVideoProps
> = ({ props }) => {
  if (!props.beats || props.beats.beats.length === 0) {
    return { durationInFrames: 1 };
  }

  const lastBeat = props.beats.beats[props.beats.beats.length - 1];
  const total =
    (lastBeat as Beat).startFrame + (lastBeat as Beat).durationInFrames;

  return { durationInFrames: total };
};
