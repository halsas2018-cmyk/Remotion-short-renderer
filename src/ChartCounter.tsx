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
  durationInFrames?: number;
  // Timing percentages
  countDurPct?: number;
  labelDelayPct?: number;
  labelDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

function formatNumber(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return `${(num / 1e12).toFixed(absNum >= 1e13 ? 0 : 1).replace(/\.0$/, "")}T`;
  if (absNum >= 1e9) return `${(num / 1e9).toFixed(absNum >= 1e10 ? 0 : 1).replace(/\.0$/, "")}B`;
  if (absNum >= 1e6) return `${(num / 1e6).toFixed(absNum >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (absNum >= 1e3) return `${(num / 1e3).toFixed(absNum >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  return num.toLocaleString();
}

export const ChartCounter: React.FC<ChartCounterProps> = ({
  value,
  label,
  durationInFrames: propsDurationInFrames,
  countDurPct = 0.20,
  labelDelayPct = 0.05,
  labelDurPct = 0.10,
  sliderDurPct = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // Non-text card: entrance completes by ~25-30%
  const countDuration = Math.round(durationInFrames * countDurPct);
  const labelStart = Math.round(durationInFrames * labelDelayPct);
  const labelDuration = Math.round(durationInFrames * labelDurPct);
  const labelEnd = labelStart + labelDuration;
  const entranceEnd = Math.max(countDuration, labelEnd);
  const sliderStart = entranceEnd;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  const countProgress = interpolate(frame, [0, countDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelProgress = interpolate(frame, [labelStart, labelEnd], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isIdle = frame > entranceEnd;
  const idleTimeSeconds = isIdle ? (frame - entranceEnd) / fps : 0;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;
  const cardBounceY = isIdle ? 6 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 0;
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardWidth = Math.min(520, availableWidth);
  const cardHeight = 280;
  const cardBorderRadius = Math.max(32, width * 0.03);
  const sliderPadding = 24;
  const sliderWidth = cardWidth + 2 * sliderPadding;
  const sliderHeight = cardHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const valueFontSize = Math.max(72, width * 0.065);
  const labelFontSize = Math.max(28, width * 0.026);

  const shimmerStart = entranceEnd;
  const shimmerSpeed = 25;
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };
  const getShimmerOpacity = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return 0;
    return 1;
  };

  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  const currentValue = value * countProgress;

  return (
    <AbsoluteFill style={{ width, height, backgroundColor: "transparent" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          transform: `translateY(-50%) translateY(${cardBounceY}px)`,
          width: availableWidth,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          willChange: "transform",
        }}
      >
        <div style={{ position: "relative", width: cardWidth, height: cardHeight }}>
          {/* Slider border */}
          <div
            style={{
              position: "absolute",
              top: -sliderPadding,
              left: -sliderPadding,
              right: -sliderPadding,
              bottom: -sliderPadding,
              pointerEvents: "none",
              opacity: sliderProgress,
              filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
              borderRadius: sliderBorderRadius,
            }}
          >
            <svg width={sliderWidth} height={sliderHeight} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
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

          {/* Card */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Accent top bar */}
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

            {/* Diagonal pattern */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: cardBorderRadius,
                opacity: 0.03,
                backgroundImage: `repeating-linear-gradient(45deg, ${ACCENT_COLOR} 0, ${ACCENT_COLOR} 1px, transparent 1px, transparent 20px)`,
                pointerEvents: "none",
              }}
            />

            {/* Radial glow */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${glowPulse})`,
                width: "110%",
                height: "110%",
                borderRadius: cardBorderRadius,
                background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)`,
                opacity: glowOpacity,
                filter: `blur(60px)`,
                pointerEvents: "none",
                zIndex: -1,
              }}
            />

            {/* Content */}
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <div
                style={{
                  fontSize: valueFontSize,
                  fontWeight: 800,
                  color: ACCENT_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1,
                  letterSpacing: -2,
                  opacity: countProgress,
                  transform: [{ scale: interpolate(countProgress, [0, 1], [0.5, 1], {
                    easing: Easing.spring({ damping: 200 }),
                    output: "perceptual-scale",
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }) }],
                  transformOrigin: "center",
                  willChange: "transform, opacity",
                }}
              >
                {formatNumber(currentValue)}
              </div>
              <div
                style={{
                  fontSize: labelFontSize,
                  fontWeight: 700,
                  color: DARK_TEXT,
                  fontFamily: "system-ui, sans-serif",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginTop: 16,
                  opacity: labelProgress,
                  transform: [{ translateY: interpolate(labelProgress, [0, 1], [20, 0]) }],
                }}
              >
                {label}
              </div>
            </div>

            {/* Shimmer */}
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
