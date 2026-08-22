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
const MARKER_COLOR = "#FFD700";
const LINE_COLOR = "rgba(255,255,255,0.3)";

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
  const centerY = height / 2;
  const markerRadius = 12;
  const labelOffset = 60;

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
          width: availableWidth,
          position: "relative",
        }}
      >
        {/* Horizontal line */}
        <div
          style={{
            position: "absolute",
            top: centerY,
            left: 0,
            width: `${lineProgress * 100}%`,
            height: 2,
            backgroundColor: LINE_COLOR,
            transformOrigin: "left center",
          }}
        />

        {/* Markers and labels */}
        {events.map((event, i) => {
          const xPos = (i / (events.length - 1)) * availableWidth;
          const markerProg = markerProgresses[i];
          const isActive = markerProg > 0;

          return (
            <React.Fragment key={i}>
              {/* Vertical line from center to marker */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: xPos,
                    top: centerY,
                    width: 2,
                    height: labelOffset,
                    backgroundColor: LINE_COLOR,
                    transformOrigin: "top center",
                    transform: [{ scaleY: markerProg }],
                    opacity: markerProg,
                  }}
                />
              )}

              {/* Marker circle */}
              <div
                style={{
                  position: "absolute",
                  left: xPos - markerRadius,
                  top: centerY - labelOffset - markerRadius,
                  width: markerRadius * 2,
                  height: markerRadius * 2,
                  borderRadius: "50%",
                  backgroundColor: MARKER_COLOR,
                  transformOrigin: "center",
                  transform: [
                    { scale: markerProg * (isIdle ? idlePulse : 1) },
                  ],
                  opacity: markerProg,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "black",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {event.marker}
                </span>
              </div>

              {/* Marker label (year) above */}
              <div
                style={{
                  position: "absolute",
                  left: xPos,
                  top: centerY - labelOffset - markerRadius * 2 - 30,
                  transform: [{ translateX: -50 }],
                  whiteSpace: "nowrap",
                  opacity: markerProg,
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "white",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {event.marker}
                </span>
              </div>

              {/* Event description below */}
              <div
                style={{
                  position: "absolute",
                  left: xPos,
                  top: centerY + labelOffset + markerRadius,
                  transform: [{ translateX: -50 }],
                  width: availableWidth / events.length * 0.9,
                  textAlign: "center",
                  opacity: markerProg,
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "system-ui, sans-serif",
                    lineHeight: 1.3,
                  }}
                >
                  {event.label}
                </span>
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
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      events: [
        { marker: "2024", label: "Meta raised $27B" },
        { marker: "2029", label: "Exposure could hit $370B" },
      ],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
