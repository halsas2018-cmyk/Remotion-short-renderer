import React, { createContext, useContext, useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export type SceneTransitionContextValue = {
  isIdle: boolean;
  entranceProgress: number; // 0 -> 1 during entrance
  exitProgress: number; // 0 -> 1 during exit
  idleProgress: number; // 0 -> 1 during idle hold
  overallProgress: number; // 0 -> 1 across the whole beat
};

/**
 * Default context — when a component is rendered outside a SceneTransition
 * (e.g. a *Test composition in Studio), it gets identity values so it still
 * works in isolation.
 */
const defaultContextValue: SceneTransitionContextValue = {
  isIdle: true,
  entranceProgress: 1,
  exitProgress: 0,
  idleProgress: 0,
  overallProgress: 1,
};

const SceneTransitionContext = createContext<SceneTransitionContextValue>(
  defaultContextValue,
);

export const useSceneTransition = (): SceneTransitionContextValue =>
  useContext(SceneTransitionContext);

/**
 * Phase budgets (in % of the beat's duration).
 * Tuned for short-form YouTube Shorts (1.5s - 4s beats).
 */
const ENTRANCE_FRACTION = 0.18; // first 18% = entrance animation
const EXIT_FRACTION = 0.18; // last 18% = exit animation
// middle (~64%) is the idle hold, where the beat sits at rest

type SceneTransitionProps = {
  children: React.ReactNode;
  /** Override the entrance phase budget (frames). If set, ENTRANCE_FRACTION is ignored. */
  entranceFrames?: number;
  /** Override the exit phase budget (frames). If set, EXIT_FRACTION is ignored. */
  exitFrames?: number;
};

/**
 * Wraps a beat's content in entrance / idle / exit animation context.
 *
 * Children can use `useSceneTransition()` to read the four progress values
 * and `interpolate()` against them. Most existing components do not yet use
 * this hook, so the default behavior is a gentle opacity-driven entrance
 * + exit baked into the wrapper itself.
 */
export const SceneTransition: React.FC<SceneTransitionProps> = ({
  children,
  entranceFrames,
  exitFrames,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const entranceDuration = entranceFrames ?? Math.round(durationInFrames * ENTRANCE_FRACTION);
  const exitDuration = exitFrames ?? Math.round(durationInFrames * EXIT_FRACTION);
  const exitStart = Math.max(0, durationInFrames - exitDuration);

  const value = useMemo<SceneTransitionContextValue>(() => {
    const entranceProgress = interpolate(
      frame,
      [0, Math.max(1, entranceDuration)],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    const exitProgress = interpolate(
      frame,
      [exitStart, Math.max(exitStart + 1, durationInFrames)],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    const idleStart = entranceDuration;
    const idleEnd = exitStart;
    const idleDuration = Math.max(1, idleEnd - idleStart);
    const idleProgress = interpolate(
      frame,
      [idleStart, idleEnd],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    const overallProgress = interpolate(
      frame,
      [0, Math.max(1, durationInFrames - 1)],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    const isIdle =
      frame >= entranceDuration && frame < exitStart;

    return {
      isIdle,
      entranceProgress,
      exitProgress,
      idleProgress,
      overallProgress,
    };
  }, [frame, durationInFrames, entranceDuration, exitStart, exitFrames]);

  // Default wrapper behavior: a gentle entrance (fade + slide-up) and exit (fade).
  // Children that read useSceneTransition() can layer their own animations on top.
  const opacity = value.entranceProgress * (1 - value.exitProgress);
  const translateY = interpolate(
    value.entranceProgress,
    [0, 1],
    [24, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <SceneTransitionContext.Provider value={value}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity,
          translate: `0 ${translateY}px`,
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </SceneTransitionContext.Provider>
  );
};
