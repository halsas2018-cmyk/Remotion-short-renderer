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
  // INTERNAL TIMELINE — completes by ~30%, then holds
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

  // Card bounce animation (idle) - 6px vertical bounce matching other components
  const cardBounceY = isIdle ? 6 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 0;

  // Glow pulse animation (idle)
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Shimmer timing
  const shimmerSpeed = 25;
  const lineShimmerStart = lineStart + lineDuration;
  const markerShimmerStarts = events.map((_, i) => markersStart + i * markerStagger + markerDuration);

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  
  // Larger marker radius to accommodate year text (4 digits need more space)
  const markerRadius = Math.max(36, width * 0.033);
  const labelOffset = Math.max(100, height * 0.05);
  const labelCardHeight = 56;
  const cardHeight = Math.min(520, height * 0.48);

  // Card dimensions (for slider and card styling)
  const cardWidth = availableWidth;
  const cardBorderRadius = Math.max(28, width * 0.026);
  const sliderPadding = 24;
  const sliderWidth = cardWidth + 2 * sliderPadding;
  const sliderHeight = cardHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const markerFontSize = Math.max(24, markerRadius * 0.55);
  const yearFontSize = Math.max(32, width * 0.03);
  const labelFontSize = Math.max(28, width * 0.026);
  const descCardBorderRadius = Math.max(16, width * 0.015);

  // Shimmer position calculation
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  // Shimmer opacity - 0 before start, then follows progress
  const getShimmerOpacity = (shimmerStartFrame: number, progress: number) => {
    if (frame < shimmerStartFrame) return 0;
    return progress;
  };

  // Slider path animation
  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  // Calculate marker X positions (evenly distributed)
  const getMarkerX = (index: number) => {
    if (events.length === 1) return cardWidth / 2;
    return (index / (events.length - 1)) * cardWidth;
  };

  // Calculate description card position (constrained to container)
  const getDescPosition = (xPos: number, cardWidth: number) => {
    const halfCardWidth = cardWidth / 2;
    if (xPos + halfCardWidth > cardWidth) {
      return { left: cardWidth, transform: "translateX(-100%)" };
    } else if (xPos - halfCardWidth < 0) {
      return { left: 0, transform: "translateX(0)" };
    } else {
      return { left: xPos, transform: "translateX(-50%)" };
    }
  };

  // Description card width (responsive, based on number of events)
  const descCardWidth = Math.min(
    cardWidth / Math.max(events.length, 2) * 0.9,
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
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          transform: `translateY(-50%) translateY(${cardBounceY}px)`,
          width: availableWidth,
          height: cardHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          willChange: "transform",
        }}
      >
        {/* Card container - explicit dimensions matching card outer size */}
        <div
          style={{
            position: "relative",
            width: cardWidth,
            height: cardHeight,
          }}
        >
          {/* Slider animation - black border circling the card with matching curved corners */}
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

          {/* Elevated card background - WHITE with prominent curved borders */}
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
              boxSizing: "border-box",
              overflow: "hidden",
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

            {/* Subtle background pattern - diagonal lines (3% opacity) */}
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

            {/* Radial glow behind card (animated pulse during idle) */}
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

            {/* Timeline content */}
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
              }}
            >
              {/* Horizontal line - draws from left to right */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  width: `${lineProgress * 100}%`,
                  height: 3,
                  background: `linear-gradient(90deg, ${LINE_COLOR}, ${ACCENT_COLOR}, ${LINE_COLOR})`,
                  transformOrigin: "left center",
                  transform: "translateY(-50%)",
                  borderRadius: 2,
                  opacity: lineProgress,
                }}
              />

              {/* Line shimmer */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  width: "100%",
                  height: 3,
                  transform: "translateY(-50%)",
                  background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
                  opacity: getShimmerOpacity(lineShimmerStart, lineProgress),
                  borderRadius: 2,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: getShimmerTop(lineShimmerStart),
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
                    borderRadius: 2,
                  }}
                />
              </div>

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
                          top: "50%",
                          width: 2,
                          height: labelOffset,
                          transformOrigin: "top center",
                          transform: [
                            { translateY: "-50%" },
                            { scaleY: markerProg },
                          ],
                          background: `linear-gradient(180deg, ${LINE_COLOR}, ${ACCENT_COLOR})`,
                          opacity: markerProg,
                        }}
                      />
                    )}

                    {/* Marker circle - elevated card style (shows the marker/year) */}
                    <div
                      style={{
                        position: "absolute",
                        left: xPos - markerRadius,
                        top: "50%",
                        transform: [
                          { translateY: "-50%" },
                          { translateY: `-${labelOffset + markerRadius}px` },
                          { scale: markerProg * (isIdle ? idlePulse : 1) },
                        ],
                        transformOrigin: "center",
                        width: markerRadius * 2,
                        height: markerRadius * 2,
                        borderRadius: "50%",
                        backgroundColor: MARKER_BG,
                        border: `4px solid ${MARKER_BORDER}`,
                        opacity: markerProg,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 10,
                        boxShadow: `0 8px 32px rgba(232, 108, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)`,
                        willChange: "transform, opacity",
                      }}
                    >
                      <span
                        style={{
                          fontSize: markerFontSize,
                          fontWeight: 800,
                          color: ACCENT_COLOR,
                          fontFamily: "system-ui, sans-serif",
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.marker}
                      </span>
                    </div>

                    {/* Marker shimmer - subtle radial glow */}
                    <div
                      style={{
                        position: "absolute",
                        left: xPos - markerRadius,
                        top: "50%",
                        transform: `translateY(-50%) translateY(-${labelOffset + markerRadius}px)`,
                        width: markerRadius * 2,
                        height: markerRadius * 2,
                        borderRadius: "50%",
                        background: `radial-gradient(circle at center, transparent 50%, ${ACCENT_COLOR}22 80%)`,
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
                          background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                          borderRadius: "50%",
                        }}
                      />
                    </div>

                    {/* Event description below - elevated card, constrained to screen */}
                    <div
                      style={{
                        position: "absolute",
                        left: descPos.left,
                        top: "50%",
                        transform: [
                          { translateY: "-50%" },
                          { translateY: `${labelOffset + markerRadius + 16}px` },
                          descPos.transform,
                        ],
                        width: descCardWidth,
                        textAlign: "center",
                        opacity: markerProg,
                        zIndex: 5,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "white",
                          borderRadius: descCardBorderRadius,
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
                        top: "50%",
                        transform: [
                          { translateY: "-50%" },
                          { translateY: `${labelOffset + markerRadius + 16}px` },
                          descPos.transform,
                        ],
                        width: descCardWidth,
                        height: "auto",
                        minHeight: 80,
                        borderRadius: descCardBorderRadius,
                        background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}22, transparent)`,
                        opacity: getShimmerOpacity(markerShimmerStart, markerProg),
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
                          borderRadius: descCardBorderRadius,
                        }}
                      />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Card shimmer animation - full card sweep after all content animation */}
            <div
              style={{
                position: "absolute",
                top: getShimmerTop(allAnimationsDone),
                left: 0,
                width: "100%",
                height: "18%",
                background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                opacity: getShimmerOpacity(allAnimationsDone, 1),
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
