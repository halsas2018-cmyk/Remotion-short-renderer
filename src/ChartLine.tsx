import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface ChartLinePoint {
  label: string;
  value: number;
}

interface ChartLineProps {
  points: ChartLinePoint[];
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const LIGHT_TEXT = "#6a6a6a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const LINE_COLOR = ACCENT_COLOR;
const DOT_COLOR = ACCENT_COLOR;
const GRID_COLOR = "#e8e8e8";
const AREA_GRADIENT_START = "rgba(232, 108, 0, 0.15)";
const AREA_GRADIENT_END = "rgba(232, 108, 0, 0)";

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
  return num.toLocaleString();
}

// Generate unique ID for gradient to avoid conflicts
const gradientId = `chart-line-gradient-${Math.random().toString(36).slice(2, 9)}`;

export const ChartLine: React.FC<ChartLineProps> = ({
  points,
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

  // Line drawing animation
  const lineStart = entranceFrames;
  const lineDuration = 30;
  const lineProgress = interpolate(frame, [lineStart, lineStart + lineDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Dot appearance stagger
  const dotStagger = 8;
  const dotDuration = 12;
  const dotProgresses = points.map((_, i) => {
    const start = lineStart + (i / (points.length - 1)) * lineDuration;
    return interpolate(frame, [start, start + dotDuration], [0, 1], {
      easing: easeOut,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Idle animation: subtle pulse on line
  const idlePulse = 1 + 0.01 * Math.sin(frame * 0.05);

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  // Calculate chart dimensions
  const padding = 120;
  const chartWidth = width - 2 * padding;
  const chartHeight = height * 0.55;
  const centerY = height / 2;
  const chartTop = centerY - chartHeight / 2;
  const chartBottom = centerY + chartHeight / 2;

  // Find min/max values for scaling
  const values = points.map(p => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Generate SVG path for the line
  const pathPoints = points.map((point, i) => {
    const x = (i / (points.length - 1)) * chartWidth;
    const normalizedValue = (point.value - minValue) / valueRange;
    const y = chartBottom - normalizedValue * chartHeight;
    return { x, y, value: point.value, label: point.label };
  });

  // Create path data with smooth curves
  const pathData = pathPoints.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pathPoints[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`;
  }).join(" ");

  // Calculate total path length for stroke dash animation
  const totalLength = pathPoints.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = pathPoints[i - 1];
    return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
  }, 0);

  const dashArray = totalLength;
  const dashOffset = totalLength * (1 - lineProgress);

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
          width: chartWidth,
          height: chartHeight,
          position: "relative",
        }}
      >
        {/* Chart container with elevated card effect */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "white",
            borderRadius: 24,
            boxShadow: CARD_SHADOW,
            overflow: "visible",
          }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${frac * 100}%`,
                height: 1,
                backgroundColor: GRID_COLOR,
                opacity: entranceProgress,
              }}
            />
          ))}

          {/* Y-axis labels - elevated cards */}
          {[0, 0.5, 1].map((frac, i) => {
            const val = maxValue - frac * valueRange;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: -110,
                  top: `${frac * 100}%`,
                  transform: [{ translateY: -10 }],
                  textAlign: "right",
                  width: 100,
                  opacity: entranceProgress,
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: 8,
                    padding: "4px 12px",
                    boxShadow: CARD_SHADOW,
                    display: "inline-block",
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: DARK_TEXT,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {formatNumber(val)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* SVG Line Chart */}
          <svg
            width={chartWidth}
            height={chartHeight}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              overflow: "visible",
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT_COLOR} stopOpacity={0.15} />
                <stop offset="100%" stopColor={ACCENT_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path
              d={`${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
              fill={`url(#${gradientId})`}
              opacity={entranceProgress}
            />
            {/* Line */}
            <path
              d={pathData}
              stroke={LINE_COLOR}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              style={{
                filter: "drop-shadow(0 0 8px rgba(232, 108, 0, 0.3))",
              }}
            />

            {/* Dots and labels */}
            {pathPoints.map((point, i) => {
              const dotProg = dotProgresses[i];
              if (dotProg === 0) return null;

              return (
                <React.Fragment key={i}>
                  {/* Dot with elevated glow */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={6 * dotProg}
                    fill={DOT_COLOR}
                    style={{
                      filter: "drop-shadow(0 0 6px rgba(232, 108, 0, 0.6))",
                      transformOrigin: `${point.x}px ${point.y}px`,
                    }}
                  />

                  {/* Value label above dot - elevated card */}
                  <foreignObject
                    x={point.x - 60}
                    y={point.y - 60}
                    width={120}
                    height={40}
                    opacity={dotProg}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: 8,
                        padding: "4px 12px",
                        boxShadow: CARD_SHADOW,
                        textAlign: "center",
                        transform: `scale(${dotProg})`,
                        transformOrigin: "bottom center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: ACCENT_COLOR,
                          fontFamily: "system-ui, sans-serif",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatNumber(point.value)}
                      </span>
                    </div>
                  </foreignObject>

                  {/* X-axis label below - elevated card */}
                  <foreignObject
                    x={point.x - 50}
                    y={chartHeight + 10}
                    width={100}
                    height={36}
                    opacity={dotProg}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: 8,
                        padding: "4px 8px",
                        boxShadow: CARD_SHADOW,
                        textAlign: "center",
                        transform: `scale(${dotProg})`,
                        transformOrigin: "top center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 500,
                          color: MEDIUM_TEXT,
                          fontFamily: "system-ui, sans-serif",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {point.label}
                      </span>
                    </div>
                  </foreignObject>
                </React.Fragment>
              );
            })}
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ChartLineTestComposition: React.FC = () => (
  <Composition
    id="ChartLineTest"
    component={ChartLine}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      points: [
        { label: "Q1", value: 12000000000 },
        { label: "Q2", value: 18000000000 },
        { label: "Q3", value: 15000000000 },
        { label: "Q4", value: 27000000000 },
      ],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
