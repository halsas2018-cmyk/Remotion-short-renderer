import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface ChartComparisonProps {
  items: { label: string; value: number }[];
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

// Number formatting with suffixes (same as ChartCounter)
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

export const ChartComparison: React.FC<ChartComparisonProps> = ({
  items,
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

  // Entrance animation for whole component
  const entranceProgress = interpolate(frame, [0, entranceFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = entranceProgress;

  // Exit animation for whole component
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.9], {
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

  // Idle animation: subtle scale pulse on container only
  const idleScale = 1 + 0.01 * Math.sin(frame * 0.06);

  // Combined transform values
  const scale = isEntrance ? entranceScale : isExit ? exitScale : idleScale;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  // Find max value for proportional scaling
  const maxValue = Math.max(...items.map((item) => item.value));
  
  // Stagger delay per item (in frames)
  const staggerFrames = 12;
  
  // Each item's animation duration (slightly shorter than total to allow stagger)
  const itemDurationFrames = durationInFrames - staggerFrames * (items.length - 1);

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
          width: "100%",
          maxWidth: width - 240,
        }}
      >
        {items.map((item, index) => {
          // Staggered start frame for this item
          const itemStartFrame = index * staggerFrames;
          const itemEndFrame = itemStartFrame + itemDurationFrames;
          
          // Progress for this specific item (0 to 1)
          const itemProgress = interpolate(frame, [itemStartFrame, itemEndFrame], [0, 1], {
            easing: easeOut,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          
          // Bar width proportional to value
          const barWidthPercent = (item.value / maxValue) * 100 * itemProgress;
          
          // Label/value fade in slightly after bar starts
          const labelDelayFrames = 8;
          const labelProgress = interpolate(frame, [itemStartFrame + labelDelayFrames, itemEndFrame], [0, 1], {
            easing: easeOut,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Idle animation for bars only: subtle width breathing (not on value label)
          const idleBarBreath = isIdle ? 1 + 0.005 * Math.sin(frame * 0.08 + index) : 1;
          const finalBarWidth = barWidthPercent * idleBarBreath;

          return (
            <div
              key={item.label}
              style={{
                marginBottom: index < items.length - 1 ? 60 : 0,
                opacity: labelProgress,
                transform: `translateY(${interpolate(labelProgress, [0, 1], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 600,
                    fontFamily: "system-ui, sans-serif",
                    color: "rgba(255, 255, 255, 0.9)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    fontFamily: "system-ui, sans-serif",
                    color: "white",
                    whiteSpace: "nowrap",
                    marginLeft: 24,
                  }}
                >
                  {/* FIXED: Show final formatted value without idle fluctuation */}
                  {formatNumber(item.value)}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${finalBarWidth}%`,
                    height: "100%",
                    backgroundColor: "white",
                    borderRadius: 8,
                    transformOrigin: "left center",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Test composition for isolated preview/render
export const ChartComparisonTestComposition: React.FC = () => (
  <Composition
    id="ChartComparisonTest"
    component={ChartComparison}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      items: [
        { label: "Broadcom", value: 70000000000 },
        { label: "Nvidia", value: 500000000000 },
      ],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
