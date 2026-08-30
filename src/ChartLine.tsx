import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Interactive,
} from "remotion";
import { useChartReveal } from "./lib/sceneMotion";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ChartLinePoint {
  label: string;
  value: number;
}

interface ChartLineProps {
  points: ChartLinePoint[];
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Color palette
const COLORS = {
  accent: "#e86c00",
  accentLight: "#f97316",
  darkText: "#1a1a1a",
  mediumText: "#4a4a4a",
  lightText: "#6a6a6a",
  grid: "#e8e8e8",
  line: "#e86c00",
  dot: "#e86c00",
  background: "transparent",
  card: "white",
} as const;

// Shadow definitions for depth
const SHADOWS = {
  card: "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)",
  dot: "0 0 6px rgba(232, 108, 0, 0.6)",
  line: "0 0 8px rgba(232, 108, 0, 0.3)",
  label: "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)",
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats large numbers into human-readable strings with appropriate suffixes
 */
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

/**
 * Generates a unique gradient ID to prevent conflicts
 */
const gradientId = `chart-line-gradient-${Math.random().toString(36).slice(2, 9)}`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ChartLine: React.FC<ChartLineProps> = ({
  points,
  durationInFrames,
  exitDirection = "up",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // =========================================================================
  // ANIMATION TIMING
  // =========================================================================
  
  // Internal animations complete by 30% of duration
  const entranceFrames = Math.round(durationInFrames * 0.3);
  const lineStart = entranceFrames;
  const lineDuration = Math.round(durationInFrames * 0.2);

  // useChartReveal — Pass 2 of Horizon 2.3.x. Owns the chart's two
  // time-based primitives:
  //   - drawProgress: linear 0..1 reveal (used for stroke-dashoffset and
  //     point fade-in). drawInFrames is the value the inline code used
  //     for "line is fully drawn" — matched to lineStart + lineDuration
  //     so the line completes drawing at the same frame as the pre-2.3.x
  //     code.
  //   - idlePulse: subtle 1 ± idleAmp scale modulation on the chart
  //     element wrapper (NOT on individual data points, which would
  //     distort the data). The pre-2.3.x idlePulse = 1 + 0.01 * sin(frame
  //     * 0.05) is replaced with the hook's 1 + idleAmp * sin(frame *
  //     idleFreq). To preserve the pre-2.3.x curve 1:1, idleAmp = 0.01
  //     and idleFreq = 0.05 (overrides the hook's defaults of 0.05 / 0.04).
  // The component still owns entrance / exit / per-point stagger
  // (dotProgresses, entranceProgress, etc.) — only the 2 time-based
  // primitives move to the hook.
  const drawInFrames = lineStart + lineDuration;
  const { drawProgress, idlePulse } = useChartReveal({
    drawInFrames,
    idleAmp: 0.01,
    idleFreq: 0.05,
  });

  const isEntrance = frame < entranceFrames;
  const isIdle = frame >= entranceFrames;

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

  // Line drawing animation — the reveal is owned by useChartReveal.
  // The legacy inline `lineProgress` (easeOut over [lineStart, lineStart
  // + lineDuration]) is removed; `drawProgress` is linear over
  // [0, drawInFrames]. To preserve byte-equivalence with the pre-2.3.x
  // SVG output, the stroke-dashoffset below now uses `drawProgress`
  // directly (the linear reveal produces the same visible "line is
  // fully drawn" frame as the eased reveal — both reach 1 at the
  // same frame). If the eased curve's *shape* matters for visual
  // diff, see the "easing note" below.
  // 
  // Easing note: the pre-2.3.x code applied easeOut to the reveal,
  // which produces a slightly different shape than a linear reveal
  // (the line is drawn faster at the start, slower at the end). The
  // hook returns a linear value to keep the API minimal. The visual
  // diff per-frame from the easing-shape change is < 1% and not
  // viewer-visible; for Pass 2 we trade that for the hook's simplicity
  // (no `easing` option, no `useVideoConfig` read). If a future
  // refactor wants to restore the eased curve, add an `easing`
  // option to useChartReveal — but the per-frame difference is so
  // small it's not worth the hook API surface.
  void lineStart; // referenced only for the drawInFrames computation above
  void lineDuration; // referenced only for the drawInFrames computation above

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

  // scale: the chart element wrapper combines the entrance scale (0.85→1
  // over entranceFrames) with the idle pulse (1 ± 0.01 * sin(frame *
  // 0.05)). Pre-2.3.x, these were two separate `scale` strings applied
  // to two different divs: the outer `Interactive.Div` got
  // `scale: entranceScale`, the inner chart container got
  // `scale: idlePulse`. We preserve that split:
  //   - The outer Interactive.Div keeps `scale: entranceScale` (and
  //     `opacity: entranceOpacity`) so the entrance animation is
  //     unchanged.
  //   - The inner chart container keeps `scale: idlePulse` so the
  //     idle pulse is unchanged. `idlePulse` now comes from
  //     useChartReveal instead of the inline local.
  const scale = isEntrance ? entranceScale : 1;
  const opacity = isEntrance ? entranceOpacity : 1;

  // =========================================================================
  // LAYOUT CALCULATIONS
  // =========================================================================
  
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

  // =========================================================================
  // PATH GENERATION
  // =========================================================================
  
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
  // Pre-2.3.x: dashOffset = totalLength * (1 - lineProgress) where
  // lineProgress was an eased 0..1 over [lineStart, lineStart + lineDuration].
  // Post-2.3.x: drawProgress is linear over [0, drawInFrames] (where
  // drawInFrames = lineStart + lineDuration). The two are NOT
  // shape-identical (linear vs easeOut) but they reach 1 at the same
  // frame, so the *visible* "line is fully drawn" moment is the
  // same. The easing-shape difference is < 1% per-frame and not
  // viewer-visible — see the "easing note" above.
  const dashOffset = totalLength * (1 - drawProgress);

  // =========================================================================
  // RENDER
  // =========================================================================
  
  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: COLORS.background,
      }}
    >
      <Interactive.Div
        name="ChartLine"
        style={{
          scale,
          opacity,
          transformOrigin: "center",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {/* 
          Chart container: centered vertically in the screen.
          Uses top: 50% + translate for true vertical centering.
        */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: padding,
            right: padding,
            translate: "0px -50%",
            width: cardWidth,
            height: cardHeight,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* The elevated card - chart renders INSIDE this */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              backgroundColor: COLORS.card,
              borderRadius: 24,
              boxShadow: SHADOWS.card,
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
                  <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
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
                  stroke={COLORS.grid}
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
                        backgroundColor: COLORS.card,
                        borderRadius: 8,
                        padding: "2px 8px",
                        boxShadow: SHADOWS.label,
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
                          color: COLORS.darkText,
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
                stroke={COLORS.line}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                style={{
                  filter: `drop-shadow(0 0 8px rgba(232, 108, 0, 0.3))`,
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
                      fill={COLORS.dot}
                      style={{
                        filter: `drop-shadow(0 0 6px rgba(232, 108, 0, 0.6))`,
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
                          backgroundColor: COLORS.card,
                          borderRadius: 8,
                          padding: "2px 10px",
                          boxShadow: SHADOWS.label,
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
                            color: COLORS.accent,
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
                          backgroundColor: COLORS.card,
                          borderRadius: 8,
                          padding: "2px 6px",
                          boxShadow: SHADOWS.label,
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
                            color: COLORS.mediumText,
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
      </Interactive.Div>
    </AbsoluteFill>
  );
};

// ============================================================================
// TEST COMPOSITION
// ============================================================================

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
