import React, { createContext, useContext } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { Beat, TimedBeats } from "./beats/types";
import {
  BeatContent,
  shouldShowKineticCaptions,
} from "./beats/renderBeat";
import { PersistentBackground } from "./PersistentBackground";
import { BeatKineticCaptions } from "./audio/BeatKineticCaptions";
import type { Word } from "./beats/words";
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
/*  Why this no longer uses <TransitionSeries>:                        */
/*    The cross-fade between beats needs to happen at the SAME global */
/*    time as the spoken audio transition in the narration. The Python */
/*    pipeline emits `startFrame` for every beat (the absolute frame   */
/*    in the composition at which the beat begins). <TransitionSeries */
/*    .Sequence> only supports `durationInFrames` — NOT `from` — so   */
/*    beats are forced back-to-back from frame 0, which desyncs them  */
/*    from the global word timestamps in `public/timestamps.json`.    */
/*                                                                     */
/*    Instead, each beat is laid out at its absolute `startFrame` via  */
/*    a regular <Sequence from={startFrame} durationInFrames=...>.    */
/*    Adjacent beats overlap by `computeTransitionFrames()` frames;  */
/*    the overlap is the cross-fade window. During the overlap, the  */
/*    outgoing beat's <SceneTransition> drives its exit fade while    */
/*    the incoming beat's <SceneTransition> drives its entrance fade,  */
/*    producing the same visual cross-fade that <TransitionSeries>    */
/*    would have given us — but at the correct global frame.          */
/*                                                                     */
/*    The whoosh SFX is mounted inside the outgoing beat's <Sequence> */
/*    for `transitionFrames` frames ending at the next beat's         */
/*    startFrame. Volume is constant over those frames.               */
/*                                                                     */
/*  A looping ambient track plays underneath the narration for the    */
/*  whole composition. Volume fades in over the first second and then */
/*  holds at AMBIENT_SFX_VOLUME so it stays a quiet bed under the     */
/*  narration, the whoosh, and the typing clicks.                    */
/*                                                                     */
/*  Render-time audio logs (Horizon 0.4 — 1.4):                        */
/*    Every <Audio> in this file (narration, ambient, whoosh) is      */
/*    paired with a sibling <AudioMountLog> component that emits a    */
/*    one-line [audio] ... log via useEffect(..., []) on mount.       */
/*    The sibling approach (rather than `onMount` on the <Audio>     */
/*    itself) is required because <Audio>'s onMount is a time-driven  */
/*    lifecycle hook that does NOT fire during a `still` (single-    */
/*    frame) render — see the comment in src/audio/AudioMountLog.tsx.*/
/*    Typing-click mounts are logged from                             */
/*    src/audio/BeatKineticCaptions.tsx using the same sibling-       */
/*    component pattern, so the format is consistent across all four */
/*    audio sources.                                                  */
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
  const { fps, durationInFrames: totalDurationInFrames } = useVideoConfig();

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
        <Sequence>. This means `useCurrentFrame()` inside it returns
        the global composition frame, so the background animates
        continuously across all beats (and through cross-fades)
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

        The audio plays in its own (unmodified) timeline starting at
        global frame 0, which is what syncs the visuals to the words.

        The <AudioMountLog> sibling emits the [audio] narration line
        via useEffect on first mount (still-render safe).
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
        Beat layout.

        Each beat is mounted at its absolute `startFrame` via
        <Sequence from={beat.startFrame} durationInFrames=...>.

        Adjacent beats overlap by `computeTransitionFrames()` frames.
        During the overlap:
          - the outgoing beat is still mounted (its <SceneTransition>
            drives an opacity fade via `exitProgress`)
          - the incoming beat is mounted at its `startFrame` (its
            <SceneTransition> drives an opacity fade-in via
            `entranceProgress`)
        The two opacities multiply to produce the visual cross-fade.
        Because the beats are positioned in absolute coordinates, the
        click-track and the captions — which use `w.start * fps` (a
        global frame number from WhisperX) — line up with the audio.

        The whoosh SFX is mounted inside the OUTGOING beat's
        <Sequence> for `transitionFrames` frames, ending at the next
        beat's startFrame. The first beat has no outgoing transition
        (no incoming either), so no SFX plays for it. The final beat
        has no outgoing transition so the closing fade-out is silent.

        NOTE: <Sequence from={...}> on a child of <AbsoluteFill> shifts
        that child's `useCurrentFrame()` to 0 at the `from` boundary,
        so all of the beat's existing animations (which read
        `useCurrentFrame()` expecting 0 at the start of the beat)
        continue to work without modification.

        We render an outer <Sequence> for the WHOLE composition first,
        so that any future per-composition overlays (e.g. intro card,
        outro) can be added with a single `from` and a duration.
      */}
      {allBeats.map((beat, index) => {
        const next = allBeats[index + 1];
        const isLast = !next;
        const transitionFrames = isLast
          ? 0
          : computeTransitionFrames(
              beat.durationInFrames,
              next.durationInFrames,
            );

        // The cross-fade window starts `transitionFrames` frames before
        // the end of this beat, and ends at this beat's last frame.
        // The whoosh SFX lives in that window.
        const whooshFrom = isLast
          ? 0
          : Math.max(
              0,
              beat.startFrame + beat.durationInFrames - transitionFrames,
            );

        return (
          <Sequence
            key={`beat-${index}`}
            from={beat.startFrame}
            durationInFrames={beat.durationInFrames}
            name={`Beat ${index}: ${beat.type}`}
          >
            <BeatContent
              beat={beat}
              allWords={words}
              beatIndex={index}
              fps={fps}
              crossFadeFrames={transitionFrames}
            />

            {shouldShowKineticCaptions(beat.type) ? (
              <BeatKineticCaptions
                text={beat.text}
                words={words}
                durationInFrames={beat.durationInFrames}
                beatType={beat.type}
                fps={fps}
                startFrame={beat.startFrame}
              />
            ) : null}

            {!isLast && transitionFrames > 0 ? (
              <Sequence
                from={whooshFrom - beat.startFrame}
                durationInFrames={transitionFrames}
              >
                <Audio
                  src={TRANSITION_SFX_URL}
                  volume={TRANSITION_SFX_VOLUME}
                />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Dynamic duration via calculateMetadata                             */
/*                                                                     */
/*  totalDuration = beats.json's `totalDurationInFrames`.             */
/*                                                                     */
/*  Why we don't subtract transitions:                                */
/*    Each beat is mounted at its absolute `startFrame`, so adjacent  */
/*    beats overlap by `computeTransitionFrames()` frames. The         */
/*    composition's `totalDurationInFrames` is the END of the last    */
/*    beat, which is `lastBeat.startFrame + lastBeat.durationInFrames`*/
/*    (or higher if the last beat's `exitProgress` continues past     */
/*    its nominal end — the Python pipeline already pads the last     */
/*    beat's duration to cover its exit). The orchestrator therefore  */
/*    uses `beats.totalDurationInFrames` directly.                    */
/*                                                                     */
/*  Why we no longer fall back to a 1-frame video on empty beats:     */
/*    The upstream fetch in Root.tsx::renderDataCalculateMetadata is  */
/*    now a HARD ERROR (Horizon 0.1 — 1.1). If public/beats.json is   */
/*    missing, malformed, or fails schema validation, the render      */
/*    aborts before this function runs. Reaching this function with   */
/*    an empty `beats` array therefore means a programming bug in     */
/*    the upstream pipeline, not a graceful fallback case — so we     */
/*    just trust the value from props and surface the runtime error   */
/*    if any is thrown by Remotion while rendering.                   */
/* ------------------------------------------------------------------ */

export const calculateMetadata: CalculateMetadataFunction<
  MotionGraphicsVideoProps
> = ({ props }) => {
  // The Python pipeline already accounts for the cross-fade overlap in
  // `totalDurationInFrames`, so we use it directly. This keeps the
  // orchestrator's declared duration in lock-step with the rendered
  // timeline, which is what makes the audio and the components stay
  // in sync.
  return { durationInFrames: props.beats.totalDurationInFrames };
};
