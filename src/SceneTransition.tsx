import React, { createContext, useContext, useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

interface SceneTransitionContextValue {
  isIdle: boolean;
  entranceProgress: number;
  exitProgress: number;
  idleProgress: number;
  overallProgress: number;
}

const SceneTransitionContext = createContext<SceneTransitionContextValue | null>(null);

export const useSceneTransition = (): SceneTransitionContextValue => {
  const context = useContext(SceneTransitionContext);
  if (!context) {
    throw new Error("useSceneTransition must be used within a SceneTransition provider");
  }
  return context;
};

interface SceneTransitionProps {
  durationInFrames: number;
  exitDirection: "up" | "down" | "left" | "right";
  entryDirection: "up" | "down" | "left" | "right";
  children: React.ReactNode;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

const DIRECTION_TRANSLATES: Record<"up" | "down" | "left" | "right", { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  durationInFrames,
  exitDirection,
  entryDirection,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase calculations using percentages with clamping
  const ENTRANCE_PCT = 0.15;
  const EXIT_PCT = 0.15;
  const MIN_PHASE_FRAMES = 8;
  const MAX_PHASE_FRAMES = 15;

  const entranceFrames = Math.min(MAX_PHASE_FRAMES, Math.max(MIN_PHASE_FRAMES, Math.round(durationInFrames * ENTRANCE_PCT)));
  const exitFrames = Math.min(MAX_PHASE_FRAMES, Math.max(MIN_PHASE_FRAMES, Math.round(durationInFrames * EXIT_PCT)));
  const exitStartFrame = durationInFrames - exitFrames;

  // Entrance progress (0 to 1)
  const entranceProgress = interpolate(frame, [0, entranceFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit progress (0 to 1)
  const exitProgress = interpolate(frame, [exitStartFrame, durationInFrames], [0, 1], {
    easing: easeIn,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Overall progress (0 to 1) for reference
  const overallProgress = frame / durationInFrames;

  // Idle progress (0 to 1 during idle phase)
  const idleProgress = interpolate(frame, [entranceFrames, exitStartFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase detection
  const isEntrance = frame < entranceFrames;
  const isExit = frame > exitStartFrame;
  const isIdle = !isEntrance && !isExit;

  // Entrance transform: slide from entryDirection + fade in
  const entryTranslate = DIRECTION_TRANSLATES[entryDirection];
  const entranceTranslateX = interpolate(entranceProgress, [0, 1], [entryTranslate.x * 80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceTranslateY = interpolate(entranceProgress, [0, 1], [entryTranslate.y * 80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = entranceProgress;

  // Exit transform: slide toward exitDirection + fade out
  const exitTranslate = DIRECTION_TRANSLATES[exitDirection];
  const exitTranslateX = interpolate(exitProgress, [0, 1], [0, exitTranslate.x * 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitTranslateY = interpolate(exitProgress, [0, 1], [0, exitTranslate.y * 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Combined transform values
  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isEntrance ? entranceTranslateX : isExit ? exitTranslateX : 0;
  const translateY = isEntrance ? entranceTranslateY : isExit ? exitTranslateY : 0;

  // Context value for children
  const contextValue = useMemo<SceneTransitionContextValue>(
    () => ({
      isIdle,
      entranceProgress,
      exitProgress,
      idleProgress,
      overallProgress,
    }),
    [isIdle, entranceProgress, exitProgress, idleProgress, overallProgress]
  );

  return (
    <SceneTransitionContext.Provider value={contextValue}>
      <div
        style={{
          transform: [
            { scale },
            { translateX },
            { translateY },
          ],
          opacity,
          transformOrigin: "center",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </div>
    </SceneTransitionContext.Provider>
  );
};
