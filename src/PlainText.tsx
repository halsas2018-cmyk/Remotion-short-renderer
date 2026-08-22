import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface PlainTextProps {
  text: string;
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

// Ease-out bezier curve (fast start, slow finish) - same as Material Design
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const PlainText: React.FC<PlainTextProps> = ({
  text,
  durationInFrames,
  exitDirection = "up",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const entranceFrames = 15;
  const exitStart = durationInFrames - 15;

  // Phase detection
  const isEntrance = frame < entranceFrames;
  const isExit = frame > exitStart;
  const isIdle = !isEntrance && !isExit;

  // Entrance animation: fade in + scale up
  const entranceProgress = interpolate(frame, [0, entranceFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = entranceProgress;

  // Exit animation: fade out + scale down + translate
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitTranslateY = interpolate(
    frame,
    [exitStart, durationInFrames],
    [0, exitDirection === "up" ? -60 : exitDirection === "down" ? 60 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitTranslateX = interpolate(
    frame,
    [exitStart, durationInFrames],
    [0, exitDirection === "left" ? -60 : exitDirection === "right" ? 60 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Idle animation: subtle scale pulse + vertical drift
  const idleScale = 1 + 0.01 * Math.sin(frame * 0.06);
  const idleDriftY = 4 * Math.sin(frame * 0.05);

  // Combined transform values
  const scale = isEntrance ? entranceScale : isExit ? exitScale : idleScale;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : idleDriftY;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 120,
      }}
    >
      <div
        style={{
          transform: [
            { scale },
            { translateX },
            { translateY },
          ],
          opacity,
          transformOrigin: "center",
          maxWidth: width - 240,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            color: "white",
            lineHeight: 1.25,
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Test composition for isolated preview/render
export const PlainTextTestComposition: React.FC = () => (
  <Composition
    id="PlainTextTest"
    component={PlainText}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
