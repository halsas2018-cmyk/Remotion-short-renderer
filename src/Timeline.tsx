import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface TimelineEvent {
  marker: string;
  label: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  lineDurPct?: number;
  markerStaggerPct?: number;
  markerDurPct?: number;
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
const LINE_COLOR = "#d0d0d0";
const MARKER_BG = "white";
const MARKER_BORDER = ACCENT_COLOR;
const SLIDER_COLOR = "#1a1a1a";
const CARD_BORDER = "#e8e8e8";

export const Timeline: React.FC<TimelineProps> = ({
  events,
  durationInFrames: propsDurationInFrames,
  lineDurPct = 0.15,
  markerStaggerPct = 0.04,
  markerDurPct = 0.10,
  sliderDurPct = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — completes by ~70%, then holds
  // No exit animation — designed to be wrapped by SceneTransition
  // ============================================
  const lineDuration = Math.round(durationInFrames * lineDurPct);
  const markerStagger = Math.round(durationInFrames * markerStaggerPct);
  const markerDuration = Math.round(durationInFrames * markerDurPct);
  const lineStart = 0;
  const markersStart = lineStart + lineDuration;
  const lastMarkerStart = markersStart + (events.length - 1) * markerStagger;
  const markersEnd = lastMarkerStart + markerDuration;
  const sliderStart = markersEnd;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress animations
  const lineProgress = interpolate(frame, [lineStart, lineStart + lineDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const markerProgresses = events.map((_, i) => {
    const markerStart = markersStart + i * markerStagger;
    return interpolate(frame, [markerStart, markerStart + markerDuration], [0, 1], {
      easing: easeOutExpo,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle pulse — time-based
  const allAnimationsDone = markersEnd;
  const isIdle = frame > allAnimationsDone;
  const idleTimeSeconds = (frame - allAnimationsDone) / fps;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Shimmer timing
  const shimmerSpeed = 25;
  const lineShimmerStart = lineStart + lineDuration;
  const markerShimmerStarts = events.map((_, i) => markersStart + i * markerStagger + markerDuration);

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const markerRadius = Math.max(18, width * 0.0165);
  const labelOffset = Math.max(80, height * 0.04);
  const labelCardHeight = 56;
  const cardHeight = Math.min(520, height * 0.48);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = cardHeight;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = Math.max(28, width * 0.026);
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const markerFontSize = Math.max(20, width * 0.0185);
  const yearFontSize = Math.max(32, width * 0.03);
  const labelFontSize = Math.max(28, width * 0.026);
  const cardBorderRadius = Math.max(16, width * 0.015);

  // Shimmer position calculation
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  // Slider path animation
  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  // Calculate marker X positions (evenly distributed)
  const getMarkerX = (index: number) => {
    if (events.length === 1) return availableWidth / 2;
    return (index / (events.length - 1)) * availableWidth;
  };

  // Calculate description card position (constrained to container)
  const getDescPosition = (xPos: number, cardWidth: number) => {
    const halfCardWidth = cardWidth / 2;
    if (xPos + halfCardWidth > availableWidth) {
      return { left: availableWidth, transform: "translateX(-100%)" };
    } else if (xPos - halfCardWidth < 0) {
      return { left: 0, transform: "translateX(0)" };
    } else {
      return { left: xPos, transform: "translateX(-50%)" };
    }
  };

  // Description card width (responsive, based on number of events)
  const descCardWidth = Math.min(
    availableWidth / Math.max(events.length, 2) * 0.9,
    340
  );

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      {/* Slider animation - black border circling the timeline */}
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
          height: cardHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Horizontal line - draws from left to right */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${lineProgress * 100}%`,
            height: 3,
            background: `linear-gradient(90deg, ${LINE_COLOR}, ${ACCENT_COLOR}, ${LINE_COLOR})`,
            transformOrigin: "left center",
            borderRadius: 2,
          }}
        />

        {/* Line shimmer */}
        <div
          style={{
            position: "absolute",
            top: getShimmerTop(lineShimmerStart),
            left: 0,
            width: "100%",
            height: "100%",
            background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
            opacity: lineProgress,
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />

        {/* Markers and labels */}
        {events.map((event, i) => {
          const xPos = getMarkerX(i);
          const markerProg = markerProgresses[i];
          const isActive = markerProg > 0;
          const markerShimmerStart = markerShimmerStarts[i];

          const descPos = getDescPosition(xPos, descCardWidth);

          return (
            <React.Fragment key={i}>
              {/* Vertical line from center line to marker */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: xPos,
                    top: 0,
                    width: 2,
                    height: labelOffset,
                    background: `linear-gradient(180deg, ${LINE_COLOR}, ${ACCENT_COLOR})`,
                    transformOrigin: "top center",
                    transform: [{ scaleY: markerProg }],
                    opacity: markerProg,
                  }}
                />
              )}

              {/* Marker circle - elevated card style (shows the marker/year) */}
              <div
                style={{
                  position: "absolute",
                  left: xPos - markerRadius,
                  top: -labelOffset - markerRadius,
                  width: markerRadius * 2,
                  height: markerRadius * 2,
                  borderRadius: "50%",
                  backgroundColor: MARKER_BG,
                  border: `3px solid ${MARKER_BORDER}`,
                  transformOrigin: "center",
                  transform: [
                    { scale: markerProg * (isIdle ? idlePulse : 1) },
                  ],
                  opacity: markerProg,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10,
                  boxShadow: CARD_SHADOW,
                  willChange: "transform, opacity",
                }}
              >
                <span
                  style={{
                    fontSize: markerFontSize,
                    fontWeight: 800,
                    color: ACCENT_COLOR,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {event.marker}
                </span>
              </div>

              {/* Marker shimmer */}
              <div
                style={{
                  position: "absolute",
                  left: xPos - markerRadius,
                  top: -labelOffset - markerRadius,
                  width: markerRadius * 2,
                  height: markerRadius * 2,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at center, transparent 40%, ${ACCENT_COLOR}33 70%)`,
                  opacity: markerProg,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: getShimmerTop(markerShimmerStart),
                    left: 0,
                    width: "100%",
                    height: "30%",
                    background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
                    borderRadius: "50%",
                  }}
                />
              </div>

              {/* Event description below - elevated card, constrained to screen */}
              <div
                style={{
                  position: "absolute",
                  left: descPos.left,
                  top: labelOffset + markerRadius + 16,
                  transform: descPos.transform,
                  width: descCardWidth,
                  textAlign: "center",
                  opacity: markerProg,
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: cardBorderRadius,
                    padding: "18px 24px",
                    boxShadow: CARD_SHADOW,
                    transform: `scale(${markerProg})`,
                    transformOrigin: "top center",
                    border: `1px solid ${CARD_BORDER}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: labelFontSize,
                      fontWeight: 600,
                      color: DARK_TEXT,
                      fontFamily: "system-ui, sans-serif",
                      lineHeight: 1.35,
                    }}
                  >
                    {event.label}
                  </span>
                </div>
              </div>

              {/* Description card shimmer */}
              <div
                style={{
                  position: "absolute",
                  left: descPos.left,
                  top: labelOffset + markerRadius + 16,
                  transform: descPos.transform,
                  width: descCardWidth,
                  height: "auto",
                  minHeight: 80,
                  borderRadius: cardBorderRadius,
                  background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}22, transparent)`,
                  opacity: markerProg,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: getShimmerTop(markerShimmerStart),
                    left: 0,
                    width: "100%",
                    height: "25%",
                    background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
                    borderRadius: cardBorderRadius,
                  }}
                />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const TimelineTestComposition: React.FC = () => (
  <Composition
    id="TimelineTest"
    component={Timeline}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      events: [
        { marker: "2024", label: "Meta raised $27B" },
        { marker: "2029", label: "Exposure could hit $370B" },
      ],
    }}
  />
);

// Test composition with 3 events
export const Timeline3EventsTest: React.FC = () => (
  <Composition
    id="Timeline3EventsTest"
    component={Timeline}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      events: [
        { marker: "2024", label: "Meta raised $27B" },
        { marker: "2026", label: "Broadcom acquires VMware" },
        { marker: "2029", label: "Exposure could hit $370B" },
      ],
    }}
  />
);

// Test composition with 4 events
export const Timeline4EventsTest: React.FC = () => (
  <Composition
    id="Timeline4EventsTest"
    component={Timeline}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      events: [
        { marker: "2024", label: "Meta raised $27B" },
        { marker: "2026", label: "Broadcom acquires VMware" },
        { marker: "2029", label: "Exposure could hit $370B" },
        { marker: "2032", label: "AI chip market matures" },
      ],
    }}
  />
);

// Test composition with 5 events
export const Timeline5EventsTest: React.FC = () => (
  <Composition
    id="Timeline5EventsTest"
    component={Timeline}
    durationInFrames={210}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      events: [
        { marker: "2024", label: "Meta raised $27B" },
        { marker: "2025", label: "AI infrastructure boom begins" },
        { marker: "2026", label: "Broadcom acquires VMware" },
        { marker: "2029", label: "Exposure could hit $370B" },
        { marker: "2032", label: "AI chip market matures" },
      ],
    }}
  />
);
