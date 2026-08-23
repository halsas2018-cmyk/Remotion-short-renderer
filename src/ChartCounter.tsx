import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface ChartCounterProps {
  value: number;
  label: string;
  durationInFrames: number;
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

// Ease-out bezier curve (fast start, slow finish) - same as Material Design
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Accent color for emphasis
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";

export const ChartCounter: React.FC<ChartCounterProps> = ({
  value,
  label,
  durationInFrames,
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

  // Entrance transform
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = entranceProgress;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
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
          opacity: entranceOpacity,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: "48px 64px",
            boxShadow: CARD_SHADOW,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: 400,
          }}
        >
          <div
            style={{
              fontSize: 140,
              fontWeight: 900,
              fontFamily: "system-ui, sans-serif",
              color: ACCENT_COLOR,
              lineHeight: 1,
              letterSpacing: -4,
              whiteSpace: "nowrap",
            }}
          >
            {displayValue}
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 48,
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              color: DARK_TEXT,
              lineHeight: 1.2,
              maxWidth: width - 240,
              textAlign: "center",
            }}
          >
            {label}
          </div>
        </div>
      </div>
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
