import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

// Inline design tokens (removed dependency on ./design-system)
const tokens = {
  colors: {
    accent: "#e86c00",
    accentLight: "#f97316",
    dark: "#1a1a1a",
    darkMuted: "#525252",
    light: "#a3a3a3",
    white: "#ffffff",
    cardBg: "white",
    cardBorder: "#e8e8e8",
    sliderColor: "#1a1a1a",
    dividerBg: "#fff7ed",
  },
  easing: {
    easeOut: [0.16, 1, 0.3, 1] as const,
    easeOutExpo: [0.19, 1, 0.22, 1] as const,
  },
  space: {
    lg: 24,
  },
};

const easeOut = Easing.bezier(...tokens.easing.easeOut);
const ACCENT_COLOR = tokens.colors.accent;
const DARK_TEXT = tokens.colors.dark;
const MEDIUM_TEXT = tokens.colors.darkMuted;

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

interface ChartCounterProps {
  value: number;
  label: string;
  durationInFrames: number;
  /** Card variant from design system */
  cardVariant?: "elevated" | "accent" | "glass" | "accentGlass" | "filled" | "outlined" | "minimal";
}

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

  // Card styles based on variant
  const getCardStyles = () => {
    switch (cardVariant) {
      case "filled":
        return {
          background: `linear-gradient(135deg, ${DARK_TEXT} 0%, #2d2d2d 100%)`,
          border: "none",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25), 0 8px 20px rgba(0, 0, 0, 0.15)",
        };
      case "accent":
        return {
          background: "white",
          border: `2px solid ${ACCENT_COLOR}`,
          boxShadow: "0 12px 40px rgba(232, 108, 0, 0.15), 0 4px 12px rgba(232, 108, 0, 0.08)",
        };
      case "glass":
        return {
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)",
        };
      case "accentGlass":
        return {
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${ACCENT_COLOR}40`,
          boxShadow: "0 12px 40px rgba(232, 108, 0, 0.1), 0 4px 12px rgba(232, 108, 0, 0.05)",
        };
      case "outlined":
        return {
          background: "white",
          border: `2px solid ${tokens.colors.cardBorder}`,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)",
        };
      case "minimal":
        return {
          background: "transparent",
          border: "none",
          boxShadow: "none",
        };
      default: // "elevated"
        return {
          background: "white",
          border: `1px solid ${tokens.colors.cardBorder}`,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)",
        };
    }
  };

  const cardStyles = getCardStyles();
  const isDarkVariant = cardVariant === "filled";

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) ${exitTransform}`,
          transformOrigin: "center",
          opacity: isExit ? exitOpacity : 1,
          width: "100%",
          maxWidth: width - 160,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 60,
          borderRadius: 32,
          ...cardStyles,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            fontFamily: "system-ui, sans-serif",
            color: isDarkVariant ? tokens.colors.white : ACCENT_COLOR,
            lineHeight: 1,
            letterSpacing: -4,
            whiteSpace: "nowrap",
          }}
        >
          {displayValue}
        </div>
        <div
          style={{
            marginTop: tokens.space.lg,
            fontSize: 48,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            color: isDarkVariant ? "rgba(255, 255, 255, 0.8)" : DARK_TEXT,
            lineHeight: 1.2,
            maxWidth: width - 240,
            textAlign: "center",
          }}
        >
          {label}
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
