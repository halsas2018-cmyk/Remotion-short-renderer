import React, { createContext, useContext } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  interpolate,
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
import {
  AMBIENT_SFX_FADE_IN_FRAMES,
  AMBIENT_SFX_URL,
  AMBIENT_SFX_VOLUME,
  TRANSITION_SFX_URL,
  TRANSITION_SFX_VOLUME,
} from "./lib/sceneSfx";

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
/*  beat (see src/lib/transitionDuration.ts). Each transition plays  */
/*  a short whoosh.wav (see src/lib/sceneSfx.ts) as a UI feedback    */
/*  sound — see Step 6b in CLAUDE.md.                                */
/*                                                                     */
/*  A looping ambient track plays underneath the narration for the    */
/*  whole composition. Volume fades in over the first second and then */
/*  holds at AMBIENT_SFX_VOLUME so it stays a quiet bed under the     */
/*  narration, the whoosh, and the typing clicks — see Step 6d.      */
/*                                                                     */
/*  Data inputs (all in /public, loaded at composition mount time):   */
/*    - narration.mp3   → narrationSrc (this component)               */
/*    - sfx-ambient.mp3 → AMBIENT_SFX_URL (read in sceneSfx.ts)       */
/*    - beats.json      → beats prop (Root.tsx calculateMetadata)     */
/*    - timestamps.json → words prop (Root.tsx calculateMetadata)     */
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
        Ambient SFX — a looping bed underneath the narration. Plays for
        the entire composition. Volume fades in over the first second
        and then holds at AMBIENT_SFX_VOLUME (0.15). Per audio.md best
        practices for ambient sound: `loop` + `loopVolumeCurveBehavior=
        "extend"` so the volume callback's `f` keeps incrementing across
        loops instead of resetting to 0 each cycle. The fade-in only
        happens once at the very start of the composition.

        Mounted at the root so it isn't re-mounted per beat.
      */}
      <Audio
        src={staticFile(AMBIENT_SFX_URL)}
        loop
        loopVolumeCurveBehavior="extend"
        volume={(f) =>
          interpolate(
            f,
            [0, AMBIENT_SFX_FADE_IN_FRAMES],
            [0, AMBIENT_SFX_VOLUME],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )
        }
      />

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

        SFX: each <TransitionSeries.Transition> also renders a short
        whoosh.wav at its start (volume 0.5, no loop). The first beat
        has no incoming transition, so no SFX is played for it. The
        last transition's tail is the final beat's exit — also marked
        with a whoosh for symmetry.
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
                >
                  <Audio
                    src={TRANSITION_SFX_URL}
                    volume={TRANSITION_SFX_VOLUME}
                  />
                </TransitionSeries.Transition>
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
/*                                                                     */
/*  Note: in this orchestrator, calculateMetadata is intentionally    */
/*  sync — it derives the duration from `props.beats` which is        */
/*  already populated by Root.tsx's async renderDataCalculateMetadata */
/*  (which fetches beats.json + timestamps.json from /public and      */
/*  injects them into props). The orchestrator then takes the         */
/*  already-resolved props and produces the final duration.           */
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
