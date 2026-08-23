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
  durationInFrames: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const TRACK_COLOR = "#e8e8e8";
const FILL_COLOR = ACCENT_COLOR;

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
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Meter fill animation
  const fillStart = 0;
  const fillDuration = 40;
  const fillProgress = interpolate(frame, [fillStart, fillStart + fillDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Number count-up animation
  const numberStart = 0;
  const numberDuration = 40;
  const numberProgress = interpolate(frame, [numberStart, numberStart + numberDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Label fade in
  const labelStart = 10;
  const labelDuration = 20;
  const labelProgress = interpolate(frame, [labelStart, labelStart + labelDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle animation: subtle pulse on fill
  const idlePulse = 1 + 0.02 * Math.sin(frame * 0.06);
  const idleGlow = 0.3 + 0.2 * Math.sin(frame * 0.08);

  const percentage = Math.min(1, Math.max(0, value / maxValue));
  const currentValue = value * numberProgress;
  const currentPercentage = percentage * fillProgress;

  // Circular meter dimensions
  const size = 380;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - currentPercentage);

  const padding = 120;

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
          width: width - 2 * padding,
          height: size,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Elevated card background for the meter */}
        <div
          style={{
            position: "relative",
            width: size,
            height: size,
            backgroundColor: "white",
            borderRadius: "50%",
            boxShadow: CARD_SHADOW,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
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
                  fontSize: 72,
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
                    <span style={{ fontSize: 24, fontWeight: 600, color: MEDIUM_TEXT, marginLeft: 8 }}>
                      / {formatNumber(maxValue)}
                    </span>
                  </>
                ) : (
                  `${Math.round(currentPercentage * 100)}%`
                )}
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
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
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      value: 70000000000,
      maxValue: 100000000000,
      label: "Funding Secured",
      durationInFrames: 90,
    }}
  />
);
