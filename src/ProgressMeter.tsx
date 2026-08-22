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
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const TRACK_COLOR = "rgba(255,255,255,0.1)";
const FILL_COLOR = "#FFD700";
const TEXT_COLOR = "white";
const LABEL_COLOR = "rgba(255,255,255,0.7)";

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
  exitDirection = "up",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const entranceFrames = 15;
  const exitStart = durationInFrames - 15;

  const isEntrance = frame < entranceFrames;
  const isExit = frame > exitStart;
  const isIdle = !isEntrance && !isExit;

  // Entrance animation for whole component
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

  // Exit animation
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

  // Meter fill animation
  const fillStart = entranceFrames;
  const fillDuration = 35;
  const fillProgress = interpolate(frame, [fillStart, fillStart + fillDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Number count-up animation
  const numberStart = entranceFrames;
  const numberDuration = 40;
  const numberProgress = interpolate(frame, [numberStart, numberStart + numberDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Label fade in
  const labelStart = entranceFrames + 10;
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

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

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
        backgroundColor: "black",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding,
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
              opacity={entranceProgress}
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
                filter: `drop-shadow(0 0 ${15 * idleGlow}px rgba(255, 215, 0, ${0.6 * idleGlow}))`,
                transformOrigin: `${size / 2}px ${size / 2}px`,
                transform: [{ scale: isIdle ? idlePulse : 1 }],
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
                color: TEXT_COLOR,
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
                  <span style={{ fontSize: 24, fontWeight: 600, color: LABEL_COLOR, marginLeft: 8 }}>
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
                color: LABEL_COLOR,
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
      exitDirection: "up",
    }}
  />
);
