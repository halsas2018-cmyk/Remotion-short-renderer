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
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const LINE_COLOR = "#d0d0d0";
const MARKER_BG = "white";
const MARKER_BORDER = ACCENT_COLOR;

export const Timeline: React.FC<TimelineProps> = ({
  events,
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

  // Timeline animation: line draws, then markers appear staggered
  const timelineStart = entranceFrames;
  const lineDuration = 20;
  const markerStagger = 15;
  const markerDuration = 15;

  const lineProgress = interpolate(frame, [timelineStart, timelineStart + lineDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const markerProgresses = events.map((_, i) => {
    const markerStart = timelineStart + lineDuration + i * markerStagger;
    return interpolate(frame, [markerStart, markerStart + markerDuration], [0, 1], {
      easing: easeOut,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Idle animation: subtle pulse on markers
  const idlePulse = 1 + 0.05 * Math.sin(frame * 0.06);

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  // Layout constants
  const padding = 120;
  const availableWidth = width - 2 * padding;
  const markerRadius = 20;
  const labelOffset = 100; // Distance from line to marker circle
  const labelCardHeight = 50; // Approximate height of label card

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
        position: "relative",
      }}
    >
      {/* 
        This div applies entrance/exit transforms.
        It fills the screen. The timeline content inside is centered vertically
        using absolute positioning (top: 50% + translateY(-50%)).
      */}
      <div
        style={{
          transform: [
            { scale },
            { translateX },
            { translateY },
          ],
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
          Timeline container: centered vertically in the screen.
          Uses top: 50% + translateY(-50%) for true vertical centering.
        */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: padding,
            right: padding,
            transform: "translateY(-50%)",
            width: availableWidth,
            height: "auto",
          }}
        >
          {/* Horizontal line - at the center of this container (which is screen center) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${lineProgress * 100}%`,
              height: 3,
              backgroundColor: LINE_COLOR,
              transformOrigin: "left center",
              borderRadius: 2,
            }}
          />

          {/* Markers and labels */}
          {events.map((event, i) => {
            const xPos = events.length === 1 
              ? availableWidth / 2 
              : (i / (events.length - 1)) * availableWidth;
            const markerProg = markerProgresses[i];
            const isActive = markerProg > 0;

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
                      backgroundColor: LINE_COLOR,
                      transformOrigin: "top center",
                      transform: [{ scaleY: markerProg }],
                      opacity: markerProg,
                    }}
                  />
                )}

                {/* Marker circle - elevated card style */}
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
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: ACCENT_COLOR,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {event.marker}
                  </span>
                </div>

                {/* Marker label (year) above - elevated card */}
                <div
                  style={{
                    position: "absolute",
                    left: xPos,
                    top: -labelOffset - markerRadius * 2 - labelCardHeight,
                    transform: [{ translateX: -50 }],
                    whiteSpace: "nowrap",
                    opacity: markerProg,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: 12,
                      padding: "8px 16px",
                      boxShadow: CARD_SHADOW,
                      transform: `scale(${markerProg})`,
                      transformOrigin: "bottom center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: ACCENT_COLOR,
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {event.marker}
                    </span>
                  </div>
                </div>

                {/* Event description below - elevated card */}
                <div
                  style={{
                    position: "absolute",
                    left: xPos,
                    top: labelOffset + markerRadius + 10,
                    transform: [{ translateX: -50 }],
                    width: availableWidth / Math.max(events.length, 2) * 0.85,
                    textAlign: "center",
                    opacity: markerProg,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: 16,
                      padding: "16px 24px",
                      boxShadow: CARD_SHADOW,
                      transform: `scale(${markerProg})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 28,
                        fontWeight: 600,
                        color: DARK_TEXT,
                        fontFamily: "system-ui, sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      {event.label}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
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
      durationInFrames: 120,
      exitDirection: "up",
    }}
  />
);

// Additional test composition with 3+ events to verify dynamic behavior
export const TimelineMultiTestComposition: React.FC = () => (
  <Composition
    id="TimelineMultiTest"
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
      durationInFrames: 180,
      exitDirection: "up",
    }}
  />
);
