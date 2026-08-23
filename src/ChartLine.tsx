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

  // Card dimensions - the chart IS the card
  const padding = 120;
  const cardWidth = width - 2 * padding;
  const cardHeight = height * 0.55;
  const centerY = height / 2;
  const cardTop = centerY - cardHeight / 2;

  // Internal chart area with padding inside the card
  const chartPadding = 60;
  const chartWidth = cardWidth - 2 * chartPadding;
  const chartHeight = cardHeight - 2 * chartPadding;
  const chartLeft = chartPadding;
  const chartTopInner = chartPadding;
  const chartBottom = chartTopInner + chartHeight;

  // Find min/max values for scaling
  const values = points.map(p => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Generate SVG path for the line
  const pathPoints = points.map((point, i) => {
    const x = chartLeft + (i / (points.length - 1)) * chartWidth;
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
          width: cardWidth,
          height: cardHeight,
          position: "relative",
        }}
      >
        {/* The elevated card - chart renders INSIDE this */}
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
          {/* SVG Line Chart - fills the card with internal padding */}
          <svg
            width={cardWidth}
            height={cardHeight}
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

            {/* Grid lines - inside chart area */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
              <line
                key={i}
                x1={chartLeft}
                x2={chartLeft + chartWidth}
                y1={chartBottom - frac * chartHeight}
                y2={chartBottom - frac * chartHeight}
                stroke={GRID_COLOR}
                strokeWidth={1}
                opacity={entranceProgress}
              />
            ))}

            {/* Y-axis labels - elevated cards, positioned left of chart area */}
            {[0, 0.5, 1].map((frac, i) => {
              const val = maxValue - frac * valueRange;
              const y = chartBottom - frac * chartHeight;
              return (
                <foreignObject
                  key={i}
                  x={chartLeft - 100}
                  y={y - 15}
                  width={90}
                  height={30}
                  opacity={entranceProgress}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: 8,
                      padding: "2px 8px",
                      boxShadow: CARD_SHADOW,
                      textAlign: "right",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      height: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: DARK_TEXT,
                        fontFamily: "system-ui, sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatNumber(val)}
                    </span>
                  </div>
                </foreignObject>
              );
            })}

            {/* Area fill */}
            <path
              d={`${pathData} L ${chartLeft + chartWidth} ${chartBottom} L ${chartLeft} ${chartBottom} Z`}
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
                    x={point.x - 55}
                    y={point.y - 55}
                    width={110}
                    height={36}
                    opacity={dotProg}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: 8,
                        padding: "2px 10px",
                        boxShadow: CARD_SHADOW,
                        textAlign: "center",
                        transform: `scale(${dotProg})`,
                        transformOrigin: "bottom center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
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
                    x={point.x - 45}
                    y={chartBottom + 15}
                    width={90}
                    height={32}
                    opacity={dotProg}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: 8,
                        padding: "2px 6px",
                        boxShadow: CARD_SHADOW,
                        textAlign: "center",
                        transform: `scale(${dotProg})`,
                        transformOrigin: "top center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
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
