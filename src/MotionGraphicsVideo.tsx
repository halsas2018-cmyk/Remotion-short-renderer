import React, { createContext, useContext } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { Beat, TimedBeats } from "./beats/types";
import { RenderBeat } from "./beats/renderBeat";
import { PersistentBackground } from "./PersistentBackground";
import type { Word } from "./beats/words";

/* ------------------------------------------------------------------ */
/*  Beat context                                                      */
/*  KineticCaptions imports `useBeatContext` from this module.        */
/*  When a beat is mounted via <RenderBeat>, it provides this context  */
/*  with the current beat's type and words so KineticCaptions can     */
/*  filter captions to the active beat. Outside of a beat (e.g. in   */
/*  *Test compositions), the hook returns null values.                */
/* ------------------------------------------------------------------ */

export type BeatContextValue = {
  currentBeatType: string | null;
  currentBeatText: string | null;
  currentWords: Word[];
};

const defaultBeatContext: BeatContextValue = {
  currentBeatType: null,
  currentBeatText: null,
  currentWords: [],
};

const BeatContext = createContext<BeatContextValue>(defaultBeatContext);

export const useBeatContext = (): BeatContextValue => useContext(BeatContext);

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
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        translate: "0px 38.8px",
      }}
    >
      {/*
        PersistentBackground is mounted ONCE at the root, OUTSIDE any
        <Sequence>. This means `useCurrentFrame()` inside it returns
        the global composition frame, so the background animates
        continuously across all beats instead of restarting at 0
        every time a new beat starts.
      */}
      <PersistentBackground />

      {/*
        Narration plays once for the whole composition. Mounted at the
        root so it isn't re-mounted per beat. Uses <Audio> from
        @remotion/media — this works in BOTH server-side rendering
        (the default `npx remotion render`) AND client-side rendering
        (e.g. <Player> / web-renderer), unlike <Audio> from `remotion`
        which becomes <Html5Audio> and is unsupported client-side.
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
          beat={beat as Beat}
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
