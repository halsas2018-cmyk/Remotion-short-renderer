import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

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
}

export const ChartCounter: React.FC<ChartCounterProps> = ({
  value,
  label,
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — CLAUDE.md compliant
  // Non-text card: entrance completes by 25-30% (target ~28%)
  // No exit animations (Rule 2) — designed for SceneTransition wrapper
  // Slider starts at entranceEndFrame, runs 45% (Rule 3)
  // ============================================
  
  // Entrance phases (proportional to durationInFrames)
  const cardEntranceDurPct = 0.12;    // 12% - card fade + scale in
  const countDurPct = 0.15;           // 15% - number count-up
  const labelDurPct = 0.10;           // 10% - label fade in
  const dividerDurPct = 0.05;         // 5% - decorative line
  
  const cardEntranceDuration = Math.round(durationInFrames * cardEntranceDurPct);
  const countDuration = Math.round(durationInFrames * countDurPct);
  const labelDuration = Math.round(durationInFrames * labelDurPct);
  const dividerDuration = Math.round(durationInFrames * dividerDurPct);
  
  // Staggered starts
  const cardStart = 0;
  const countStart = Math.round(durationInFrames * 0.03);  // 3% stagger
  const labelStart = countStart + Math.round(durationInFrames * 0.02);  // 2% after count starts
  const dividerStart = labelStart + labelDuration;
  
  // entranceEndFrame = when all content has finished animating in
  // Target: 25-30% of durationInFrames (Rule 1 for non-text cards)
  const entranceEndFrame = dividerStart + dividerDuration; // ≈ 28% with defaults
  
  // Slider (Rule 3): starts at entranceEndFrame, duration ~45%
  const sliderDurPct = 0.45;
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress animations
  const cardEntranceProgress = interpolate(frame, [cardStart, cardStart + cardEntranceDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const countProgress = interpolate(frame, [countStart, countStart + countDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const labelProgress = interpolate(frame, [labelStart, labelStart + labelDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const dividerProgress = interpolate(frame, [dividerStart, dividerStart + dividerDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Current animated value
  const currentValue = value * countProgress;
  const displayValue = formatNumber(currentValue);

  // Idle state — begins after entranceEndFrame (Rule 1)
  const isIdle = frame > entranceEndFrame;
  const idleTimeSeconds = isIdle ? (frame - entranceEndFrame) / fps : 0;
  
  // Idle animations
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.3) : 1;
  const glowOpacity = isIdle ? 0.5 + 0.2 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.5) : 0.4;

  // Shimmer timing — starts after entrance completes
  const shimmerStart = entranceEndFrame;
  const shimmerSpeed = 25; // % per second

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(48, width * 0.044);
  const cardBorderRadius = Math.max(32, width * 0.03);
  const cardMinHeight = Math.max(280, height * 0.22);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = cardMinHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const valueFontSize = Math.max(96, width * 0.089);
  const labelFontSize = Math.max(36, width * 0.033);

  // Shimmer position calculation
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  const getShimmerOpacity = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return 0;
    return 1;
  };

  // Slider path animation (SVG stroke-dashoffset)
  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  // Card transform
  const cardTransform = [
    { scale: interpolate(cardEntranceProgress, [0, 1], [0.92, 1], {
      easing: Easing.spring({ damping: 200 }),
      output: "perceptual-scale",
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) },
    { translateY: interpolate(cardEntranceProgress, [0, 1], [30, 0]) },
  ];

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      {/* Slider animation - black border circling the card (Rule 3) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: sliderWidth,
          height: sliderHeight,
          pointerEvents: "none",
          opacity: sliderProgress,
          filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
        }}
      >
        <svg
          width={sliderWidth}
          height={sliderHeight}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <rect
            x={sliderStrokeWidth / 2}
            y={sliderStrokeWidth / 2}
            width={sliderWidth - sliderStrokeWidth}
            height={sliderHeight - sliderStrokeWidth}
            rx={sliderBorderRadius}
            ry={sliderBorderRadius}
            fill="none"
            stroke={SLIDER_COLOR}
            strokeWidth={sliderStrokeWidth}
            strokeDasharray={sliderDashArray}
            strokeDashoffset={sliderDashOffset}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          transform: "translateY(-50%)",
          width: availableWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Wrapper — in-flow, grows with the card's natural content height */}
        <div
          style={{
            position: "relative",
            width: containerWidth,
            perspective: 1200,
          }}
        >
          {/* Elevated card for the counter — normal flow child, height follows content */}
          <div
            style={{
              position: "relative",
              minHeight: cardMinHeight,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              padding: cardPadding,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              // Entrance: fade + spring pop
              opacity: cardEntranceProgress,
              transform: cardTransform,
              transformOrigin: "center",
              // Idle: subtle pulse
              scale: idlePulse,
              willChange: "transform, opacity",
            }}
          >
            {/* Accent top bar with matching curved corners */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
                borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
              }}
            />

            {/* Subtle background pattern - diagonal lines */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: cardBorderRadius,
                opacity: 0.03,
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  ${ACCENT_COLOR} 0,
                  ${ACCENT_COLOR} 1px,
                  transparent 1px,
                  transparent 20px
                )`,
                pointerEvents: "none",
              }}
            />

            {/* Subtle radial gradient overlay for depth */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: cardBorderRadius,
                background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.02) 100%)`,
                pointerEvents: "none",
              }}
            />

            {/* Glow behind card — flex-centered wrapper instead of transform */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: -1,
              }}
            >
              <div
                style={{
                  width: "110%",
                  height: "110%",
                  borderRadius: cardBorderRadius,
                  background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)`,
                  opacity: glowOpacity,
                  filter: `blur(60px)`,
                  scale: glowPulse,
                }}
              />
            </div>

            {/* Content */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* Value with count-up animation */}
              <div
                style={{
                  fontSize: valueFontSize,
                  fontWeight: 900,
                  fontFamily: "system-ui, sans-serif",
                  color: ACCENT_COLOR,
                  lineHeight: 1,
                  letterSpacing: -4,
                  whiteSpace: "nowrap",
                  opacity: countProgress,
                  translate: `0px ${interpolate(countProgress, [0, 1], [20, 0], {
                    easing: easeOutExpo,
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}px`,
                  scale: interpolate(countProgress, [0, 1], [0.8, 1], {
                    easing: easeOutExpo,
                    output: "perceptual-scale",
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  filter: `blur(${interpolate(countProgress, [0, 1], [8, 0], {
                    easing: easeOutExpo,
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}px)`,
                  willChange: "transform, opacity, filter",
                }}
              >
                {displayValue}
              </div>

              {/* Decorative separator line */}
              <div
                style={{
                  width: 80,
                  height: 3,
                  background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)`,
                  borderRadius: 1.5,
                  opacity: dividerProgress,
                  scale: interpolate(dividerProgress, [0, 1], [0.5, 1], {
                    easing: easeOutExpo,
                    output: "perceptual-scale",
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transformOrigin: "center",
                }}
              />

              {/* Label */}
              <div
                style={{
                  fontSize: labelFontSize,
                  fontWeight: 500,
                  fontFamily: "system-ui, sans-serif",
                  color: DARK_TEXT,
                  lineHeight: 1.2,
                  maxWidth: width - 240,
                  textAlign: "center",
                  opacity: labelProgress,
                  translate: `0px ${interpolate(labelProgress, [0, 1], [20, 0], {
                    easing: easeOutExpo,
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}px`,
                  willChange: "transform, opacity",
                }}
              >
                {label}
              </div>
            </div>

            {/* Shimmer animation on card - properly positioned within card, only visible after start */}
            <div
              style={{
                position: "absolute",
                top: getShimmerTop(shimmerStart),
                left: 0,
                width: "100%",
                height: "18%",
                background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                opacity: getShimmerOpacity(shimmerStart),
                borderRadius: cardBorderRadius,
                pointerEvents: "none",
              }}
            />
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
