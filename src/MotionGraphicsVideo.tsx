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
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { computeTransitionFrames } from "./lib/transitionDuration";

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
/*                                                                     */
/*  Beats are arranged in a <TransitionSeries> with a <fade()> cross-  */
/*  fade between each pair of adjacent beats. The transition duration */
/*  is computed dynamically as a percentage of the shorter adjacent   */
/*  beat (see src/lib/transitionDuration.ts).                         */
/* ------------------------------------------------------------------ */

export const MotionGraphicsVideo: React.FC<MotionGraphicsVideoProps> = ({
  beats,
  words,
  narrationSrc,
}) => {
  const { fps } = useVideoConfig();

  const allBeats = beats.beats as Beat[];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        translate: "0px 38.8px",
      }}
    >
      {/*
        PersistentBackground is mounted ONCE at the root, OUTSIDE any
        <Sequence>/<TransitionSeries>. This means `useCurrentFrame()`
        inside it returns the global composition frame, so the background
        animates continuously across all beats (and through cross-fades)
        instead of restarting at 0 every time a new beat starts.
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
        Render beats as alternating <TransitionSeries.Sequence> and
        <TransitionSeries.Transition> children. The .map() indexes
        the data; the JSX tree is authored so each beat's
        durationInFrames is editable in Studio (per the Remotion
        video-editing rule).

        NOTE: <TransitionSeries.Sequence> does NOT support a `from`
        prop — only `durationInFrames`. Beat ordering is therefore
        determined by array order in beats.json, not by per-beat
        `startFrame`. `calculateMetadata` derives the composition
        duration from sum(beatDurations) - sum(transitionFrames).
      */}
      <TransitionSeries>
        {allBeats.map((beat, index) => {
          const next = allBeats[index + 1];
          const isLast = !next;

          return (
            <React.Fragment key={`beat-${index}`}>
              <RenderBeat
                beat={beat}
                allWords={words}
                beatIndex={index}
                fps={fps}
              />
              {!isLast ? (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({
                    durationInFrames: computeTransitionFrames(
                      beat.durationInFrames,
                      next.durationInFrames,
                    ),
                  })}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Dynamic duration via calculateMetadata                             */
/*                                                                     */
/*  totalDuration = sum(beatDurations) - sum(transitionFrames)         */
/*  The transition frames must match what the orchestrator renders,   */
/*  so we use the SAME computeTransitionFrames() helper.               */
/* ------------------------------------------------------------------ */

export const calculateMetadata: CalculateMetadataFunction<
  MotionGraphicsVideoProps
> = ({ props }) => {
  const allBeats = (props.beats?.beats ?? []) as Beat[];
  if (allBeats.length === 0) {
    return { durationInFrames: 1 };
  }

  const sumDurations = allBeats.reduce(
    (acc, b) => acc + b.durationInFrames,
    0,
  );

  let sumTransitions = 0;
  for (let i = 0; i < allBeats.length - 1; i++) {
    sumTransitions += computeTransitionFrames(
      allBeats[i].durationInFrames,
      allBeats[i + 1].durationInFrames,
    );
  }

  return { durationInFrames: Math.max(1, sumDurations - sumTransitions) };
};
