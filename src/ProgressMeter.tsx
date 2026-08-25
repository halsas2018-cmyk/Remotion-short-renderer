import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface ProgressMeterProps {
  value: number;
  maxValue: number;
  label: string;
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  fillDurPct?: number;
  numberDurPct?: number;
  labelDelayPct?: number;
  labelDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#fff4ed";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const LIGHT_TEXT = "#a3a3a3";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_SHADOW_HOVER = "0 20px 50px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08)";
const TRACK_COLOR = "#e8e8e8";
const FILL_COLOR = ACCENT_COLOR;
const SLIDER_COLOR = "#1a1a1a";
const CARD_BORDER = "#e8e8e8";

function formatNumber(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 1e12) {
    return `${(num / 1e12).toFixed(absNum >= 1e13 ? 0 : 1).replace(/\.0$/, "")}T`;
  }
  if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(absNum >= 1e10 ? 0 : 1).replace(/\.0$/, "")}B`;
  }
  if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(absNum >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(absNum >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  }
  return num.toLocaleString();
}

export const ProgressMeter: React.FC<ProgressMeterProps> = ({
  value,
  maxValue,
  label,
  durationInFrames: propsDurationInFrames,
  fillDurPct = 0.15,
  numberDurPct = 0.15,
  labelDelayPct = 0.03,
  labelDurPct = 0.10,
  sliderDurPct = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — completes by ~30%, then holds
  // No exit animation — designed to be wrapped by SceneTransition
  // ============================================
  const fillDuration = Math.round(durationInFrames * fillDurPct);
  const numberDuration = Math.round(durationInFrames * numberDurPct);
  const labelStart = Math.round(durationInFrames * labelDelayPct);
  const labelDuration = Math.round(durationInFrames * labelDurPct);
  const fillEnd = fillDuration;
  const numberEnd = numberDuration;
  const labelEnd = labelStart + labelDuration;
  const allAnimEnd = Math.max(fillEnd, numberEnd, labelEnd);
  const sliderStart = allAnimEnd;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress animations
  const fillProgress = interpolate(frame, [0, fillDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const numberProgress = interpolate(frame, [0, numberDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelProgress = interpolate(frame, [labelStart, labelStart + labelDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle pulse — time-based
  const isIdle = frame > allAnimEnd;
  const idleTimeSeconds = (frame - allAnimEnd) / fps;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;
  const idleGlow = isIdle ? 0.3 + 0.2 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.5) : 0.3;

  // Subtitle bounce during idle
  const subtitleBounceFrequency = 0.15;
  const subtitleBounceAmplitude = 6;
  const subtitleBounceOffset = isIdle
    ? Math.sin(frame * subtitleBounceFrequency * Math.PI * 2) * subtitleBounceAmplitude
    : 0;

  const percentage = Math.min(1, Math.max(0, value / maxValue));
  const currentValue = value * numberProgress;
  const currentPercentage = percentage * fillProgress;

  // Dynamic sizing based on label length
  const labelWords = label.split(" ");
  const longestWord = labelWords.reduce((a, b) => a.length > b.length ? a : b, "");
  const labelCharCount = label.length;
  const longestWordLength = longestWord.length;
  
  // Base size scales with content - wider for longer labels
  const baseSize = 380;
  const minSize = 320;
  const maxSize = 520;
  const charWidthEstimate = 14; // approximate px per character at fontSize 22
  const neededWidth = Math.max(minSize, Math.min(maxSize, labelCharCount * charWidthEstimate + 120));
  const size = Math.max(baseSize, neededWidth);
  
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - currentPercentage);

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;

  // Container dimensions (for slider) - card is circular, so container is square
  const containerWidth = size;
  const containerHeight = size;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  // Circular card - slider border radius matches the circle + padding
  const sliderBorderRadius = size / 2 + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const valueFontSize = Math.max(64, width * 0.059); // Main headline: 84px minimum
  const labelFontSize = Math.max(28, width * 0.026); // Important supporting text: 44px minimum
  const subtitleFontSize = Math.max(18, width * 0.017);

  // Shimmer position calculation - relative to card (0-100% of card height)
  // Only visible after shimmer start frame
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * 25) % 100}%`;
  };

  // Shimmer opacity - 0 before start, then follows fillProgress
  const getShimmerOpacity = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return 0;
    return fillProgress;
  };

  // Slider path animation
  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

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
          left: padding,
          right: padding,
          transform: "translateY(-50%)",
          width: availableWidth,
          height: size,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Card container - explicit dimensions matching card outer size */}
        <div
          style={{
            position: "relative",
            width: size,
            height: size,
          }}
        >
          {/* Slider animation - black border circling the meter with matching curved corners */}
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

          {/* Elevated card background for the meter - WHITE with curved borders */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "white",
              borderRadius: "50%",
              boxShadow: CARD_SHADOW,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            {/* Subtle background pattern - radial gradient */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "50%",
                opacity: 0.02,
                background: `radial-gradient(circle at center, ${ACCENT_COLOR} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            {/* Circular Progress Meter */}
            <div style={{ position: "relative", width: size, height: size }}>
              <svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
                {/* Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={TRACK_COLOR}
                  strokeWidth={strokeWidth}
                  opacity={fillProgress}
                />
                {/* Fill */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={FILL_COLOR}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{
                    filter: `drop-shadow(0 0 ${15 * idleGlow}px rgba(232, 108, 0, ${0.6 * idleGlow}))`,
                    transformOrigin: `${size / 2}px ${size / 2}px`,
                    transform: [{ scale: idlePulse }],
                  }}
                  opacity={fillProgress}
                />
              </svg>

              {/* Center content */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: size,
                  height: size,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {/* Percentage/Value number */}
                <div
                  style={{
                    fontSize: valueFontSize,
                    fontWeight: 800,
                    color: ACCENT_COLOR,
                    fontFamily: "system-ui, sans-serif",
                    lineHeight: 1,
                    letterSpacing: -2,
                    opacity: numberProgress,
                    transform: [{ scale: numberProgress }],
                  }}
                >
                  {value >= 1000 || maxValue >= 1000 ? (
                    <>
                      {formatNumber(currentValue)}
                      <span style={{ fontSize: Math.max(20, width * 0.0185), fontWeight: 600, color: MEDIUM_TEXT, marginLeft: 8 }}>
                        / {formatNumber(maxValue)}
                      </span>
                    </>
                  ) : (
                    `${Math.round(currentPercentage * 100)}%`
                  )}
                </div>

                {/* Main Label */}
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
                    whiteSpace: "nowrap",
                    maxWidth: size - 40,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {label}
                </div>

                {/* Subtitle with bouncing animation */}
                <div
                  style={{
                    fontSize: subtitleFontSize,
                    fontWeight: 500,
                    color: MEDIUM_TEXT,
                    fontFamily: "system-ui, sans-serif",
                    letterSpacing: 1,
                    marginTop: 12,
                    opacity: labelProgress,
                    transform: [
                      { translateY: interpolate(labelProgress, [0, 1], [20, 0]) },
                      { translateY: subtitleBounceOffset },
                    ],
                    transformOrigin: "center",
                    whiteSpace: "nowrap",
                    maxWidth: size - 40,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {value >= maxValue ? "Target Achieved" : "In Progress"}
                </div>
              </div>
            </div>

            {/* Shimmer animation on card - properly positioned within card, only visible after start */}
            <div
              style={{
                position: "absolute",
                top: getShimmerTop(fillDuration),
                left: 0,
                width: "100%",
                height: "18%",
                background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                opacity: getShimmerOpacity(fillDuration),
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ProgressMeterTestComposition: React.FC = () => (
  <Composition
    id="ProgressMeterTest"
    component={ProgressMeter}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      value: 70000000000,
      maxValue: 100000000000,
      label: "Funding Secured",
    }}
  />
);

// Additional test with longer label to verify dynamic sizing
export const ProgressMeterLongLabelTest: React.FC = () => (
  <Composition
    id="ProgressMeterLongLabelTest"
    component={ProgressMeter}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      value: 50000000000,
      maxValue: 100000000000,
      label: "Quarterly Revenue Target",
    }}
  />
);
