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
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const ARROW_COLOR = ACCENT_COLOR;
const BOX_BG = "white";
const BOX_BORDER = "#e8e8e8";

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

  // Idle animation: subtle pulse on current step
  const idlePulse = 1 + 0.02 * Math.sin(frame * 0.06);

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  // Layout: horizontal flow for 2-4 steps - VERTICALLY CENTERED
  const padding = 120;
  const availableWidth = width - 2 * padding;
  const boxWidth = Math.min(300, availableWidth / steps.length * 0.85);
  const boxHeight = 160;
  const gap = (availableWidth - steps.length * boxWidth) / (steps.length - 1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
        position: "relative",
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
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {/* 
          Flow container: centered vertically in the screen.
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
            height: boxHeight,
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
                {/* Step box - elevated card */}
                <div
                  style={{
                    position: "absolute",
                    left: xPos,
                    top: 0,
                    width: boxWidth,
                    height: boxHeight,
                    borderRadius: 16,
                    backgroundColor: BOX_BG,
                    border: `2px solid ${BOX_BORDER}`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    padding: 24,
                    transformOrigin: "center",
                    transform: [
                      { scale: prog * (isIdle ? idlePulse : 1) },
                    ],
                    opacity: prog,
                    boxSizing: "border-box",
                    boxShadow: CARD_SHADOW,
                  }}
                >
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: DARK_TEXT,
                      fontFamily: "system-ui, sans-serif",
                      lineHeight: 1.3,
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
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
                      top: boxHeight / 2 - 1,
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
                        borderTop: "10px solid transparent",
                        borderBottom: "10px solid transparent",
                        borderLeft: "15px solid " + ARROW_COLOR,
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
