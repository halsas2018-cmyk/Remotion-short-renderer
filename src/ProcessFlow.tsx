import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface ProcessFlowProps {
  steps: string[];
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const BOX_COLOR = "rgba(255,255,255,0.1)";
const BORDER_COLOR = "rgba(255,255,255,0.3)";
const ARROW_COLOR = "#FFD700";
const TEXT_COLOR = "white";

export const ProcessFlow: React.FC<ProcessFlowProps> = ({
  steps,
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

  // Step reveal animation: each step appears with stagger
  const stepStagger = 15;
  const stepDuration = 20;
  const stepStart = entranceFrames;

  const stepProgresses = steps.map((_, i) => {
    const start = stepStart + i * stepStagger;
    return interpolate(frame, [start, start + stepDuration], [0, 1], {
      easing: easeOut,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Arrow animation: appears after the step box
  const arrowProgresses = steps.slice(0, -1).map((_, i) => {
    const start = stepStart + (i + 1) * stepStagger;
    return interpolate(frame, [start, start + stepDuration], [0, 1], {
      easing: easeOut,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Idle animation: subtle pulse on current step? We'll do a gentle pulse on all boxes.
  const idlePulse = 1 + 0.02 * Math.sin(frame * 0.06);

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  // Layout: horizontal flow for 2-4 steps
  const padding = 120;
  const availableWidth = width - 2 * padding;
  const boxWidth = Math.min(280, availableWidth / steps.length * 0.8);
  const boxHeight = 140;
  const gap = (availableWidth - steps.length * boxWidth) / (steps.length - 1);
  const centerY = height / 2;

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {steps.map((step, i) => {
          const prog = stepProgresses[i];
          const xPos = i * (boxWidth + gap);
          const isLast = i === steps.length - 1;

          return (
            <React.Fragment key={i}>
              {/* Step box */}
              <div
                style={{
                  position: "absolute",
                  left: xPos,
                  top: centerY - boxHeight / 2,
                  width: boxWidth,
                  height: boxHeight,
                  borderRadius: 16,
                  backgroundColor: BOX_COLOR,
                  border: `2px solid ${BORDER_COLOR}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  padding: 20,
                  transformOrigin: "center",
                  transform: [
                    { scale: prog * (isIdle ? idlePulse : 1) },
                  ],
                  opacity: prog,
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: TEXT_COLOR,
                    fontFamily: "system-ui, sans-serif",
                    lineHeight: 1.3,
                  }}
                >
                  {step}
                </span>
              </div>

              {/* Arrow to next step */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: xPos + boxWidth,
                    top: centerY,
                    width: gap,
                    height: 2,
                    backgroundColor: ARROW_COLOR,
                    transformOrigin: "left center",
                    transform: [{ scaleX: arrowProgresses[i] }],
                    opacity: arrowProgresses[i],
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    paddingRight: 10,
                  }}
                >
                  {/* Arrowhead */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderTopWidth: 10,
                      borderTopStyle: "solid",
                      borderTopColor: "transparent",
                      borderBottomWidth: 10,
                      borderBottomStyle: "solid",
                      borderBottomColor: "transparent",
                      borderLeftWidth: 15,
                      borderLeftStyle: "solid",
                      borderLeftColor: ARROW_COLOR,
                      transform: [{ scaleX: arrowProgresses[i] }],
                      transformOrigin: "left center",
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ProcessFlowTestComposition: React.FC = () => (
  <Composition
    id="ProcessFlowTest"
    component={ProcessFlow}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      steps: ["Buys the chips", "Leases them back", "Customer pays over time"],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
