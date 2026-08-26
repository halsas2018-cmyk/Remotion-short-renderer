import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { Card, CardContent, tokens } from "./design-system";

interface ChartCounterProps {
  value: number;
  label: string;
  durationInFrames: number;
  /** Card variant from design system */
  cardVariant?: "elevated" | "accent" | "glass" | "accentGlass" | "filled" | "outlined" | "minimal";
}

// Number formatting with suffixes
function formatNumber(num: number): string {
  const absNum = Math.abs(num);
  
  if (absNum >= 1e12) {
    return `$${(num / 1e12).toFixed(absNum >= 1e13 ? 0 : 1).replace(/\.0$/, "")}T`;
  }
  if (absNum >= 1e9) {
    return `$${(num / 1e9).toFixed(absNum >= 1e10 ? 0 : 1).replace(/\.0$/, "")}B`;
  }
  if (absNum >= 1e6) {
    return `$${(num / 1e6).toFixed(absNum >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (absNum >= 1e3) {
    return `$${(num / 1e3).toFixed(absNum >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  }
  return `$${num.toLocaleString()}`;
}

const easeOut = Easing.bezier(...tokens.easing.easeOut);
const ACCENT_COLOR = tokens.colors.accent;
const DARK_TEXT = tokens.colors.dark;
const MEDIUM_TEXT = tokens.colors.darkMuted;

export const ChartCounter: React.FC<ChartCounterProps> = ({
  value,
  label,
  durationInFrames,
  cardVariant = "filled",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Entrance animation: fade in + scale up over first 15 frames
  const entranceFrames = 15;
  const entranceProgress = interpolate(frame, [0, entranceFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Count-up animation: ease-out curve (fast start, slow finish)
  const countProgress = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Current animated value
  const currentValue = value * countProgress;
  const displayValue = formatNumber(currentValue);

  // Exit animation
  const exitStart = durationInFrames - 15;
  const isExit = frame > exitStart;
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
    [0, -60],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Combined transform for exit
  const exitTransform = isExit
    ? `translateY(${exitTranslateY}px) scale(${exitScale})`
    : "none";

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      <Card
        variant={cardVariant}
        entrance="scale"
        idle="breathe"
        entranceDuration={entranceFrames}
        style={{
          transform: exitTransform,
          opacity: isExit ? exitOpacity : 1,
          transformOrigin: "center",
        }}
      >
        <CardContent.Header
          style={{
            fontSize: 140,
            fontWeight: 900,
            fontFamily: "system-ui, sans-serif",
            color: cardVariant === "filled" ? tokens.colors.white : ACCENT_COLOR,
            lineHeight: 1,
            letterSpacing: -4,
            whiteSpace: "nowrap",
          }}
        >
          {displayValue}
        </CardContent.Header>
        <CardContent.Body
          style={{
            marginTop: tokens.space.lg,
            fontSize: 48,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            color: cardVariant === "filled" ? "rgba(255, 255, 255, 0.8)" : DARK_TEXT,
            lineHeight: 1.2,
            maxWidth: width - 240,
            textAlign: "center",
          }}
        >
          {label}
        </CardContent.Body>
      </Card>
    </AbsoluteFill>
  );
};

// Test composition for isolated preview/render
export const ChartCounterTestComposition: React.FC = () => (
  <Composition
    id="ChartCounterTest"
    component={ChartCounter}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      value: 70000000000,
      label: "in debt",
      durationInFrames: 90,
    }}
  />
);
