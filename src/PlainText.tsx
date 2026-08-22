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
}

// Ease-out bezier curve (fast start, slow finish) - same as Material Design
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const PlainText: React.FC<PlainTextProps> = ({
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Entrance animation: fade in + scale up
  const entranceFrames = Math.min(durationInFrames, 30);
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

  // Optional: subtle fade out at the end if duration is long
  const fadeOutStartFrame = durationInFrames - 15;
  const fadeOutProgress = interpolate(frame, [fadeOutStartFrame, durationInFrames], [1, 0], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Combined opacity
  const opacity = entranceProgress * fadeOutProgress;

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
          transform: `scale(${entranceScale})`,
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
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      durationInFrames: 90,
    }}
  />
);
