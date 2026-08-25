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
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  stepDurPct?: number;
  stepStaggerPct?: number;
  arrowDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const ARROW_COLOR = ACCENT_COLOR;
const BOX_BG = "white";
const BOX_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";
const CARD_BORDER = "#e8e8e8";

export const ProcessFlow: React.FC<ProcessFlowProps> = ({
  steps,
  durationInFrames: propsDurationInFrames,
  stepDurPct = 0.12,
  stepStaggerPct = 0.04,
  arrowDurPct = 0.10,
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
  const stepDuration = Math.round(durationInFrames * stepDurPct);
  const stepStagger = Math.round(durationInFrames * stepStaggerPct);
  const arrowDuration = Math.round(durationInFrames * arrowDurPct);
  const stepStart = 0;
  const lastStepStart = stepStart + (steps.length - 1) * stepStagger;
  const stepsEnd = lastStepStart + stepDuration;
  const lastArrowStart = stepStart + steps.length * stepStagger;
  const arrowsEnd = lastArrowStart + arrowDuration;
  const allAnimEnd = Math.max(stepsEnd, arrowsEnd);
  const sliderStart = allAnimEnd;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Step reveal animation: each step appears with stagger
  const stepProgresses = steps.map((_, i) => {
    const start = stepStart + i * stepStagger;
    return interpolate(frame, [start, start + stepDuration], [0, 1], {
      easing: easeOutExpo,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Arrow animation: appears after the step box
  const arrowProgresses = steps.slice(0, -1).map((_, i) => {
    const start = stepStart + (i + 1) * stepStagger;
    return interpolate(frame, [start, start + arrowDuration], [0, 1], {
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
  const isIdle = frame > allAnimEnd;
  const idleTimeSeconds = (frame - allAnimEnd) / fps;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Shimmer timing
  const shimmerSpeed = 25;
  const stepShimmerStarts = steps.map((_, i) => stepStart + i * stepStagger + stepDuration);
  const arrowShimmerStarts = steps.slice(0, -1).map((_, i) => stepStart + (i + 1) * stepStagger + arrowDuration);

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const boxWidth = Math.min(320, availableWidth / steps.length * 0.85);
  const boxHeight = 180;
  const gap = steps.length > 1 ? (availableWidth - steps.length * boxWidth) / (steps.length - 1) : 0;

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = boxHeight;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  
  // Prominent curved borders for step boxes
  const cardBorderRadius = Math.max(32, width * 0.03); // Increased for more pronounced curves
  // Slider border radius matches card curves + padding
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const stepFontSize = Math.max(28, width * 0.026); // Important supporting text: 44px minimum

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

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      {/* Slider animation - black border circling the flow with matching curved corners */}
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
          const stepShimmerStart = stepShimmerStarts[i];
          const arrowShimmerStart = arrowShimmerStarts[i];

          return (
            <React.Fragment key={i}>
              {/* Step box - elevated card with prominent curved borders */}
              <div
                style={{
                  position: "absolute",
                  left: xPos,
                  top: 0,
                  width: boxWidth,
                  height: boxHeight,
                  borderRadius: cardBorderRadius,
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
                    fontSize: stepFontSize,
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

                {/* Accent top bar with matching curved corners */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, ${ACCENT_COLOR}, #f97316)`,
                    borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
                  }}
                />
              </div>

              {/* Step shimmer with matching curved corners */}
              <div
                style={{
                  position: "absolute",
                  left: xPos,
                  top: 0,
                  width: boxWidth,
                  height: boxHeight,
                  borderRadius: cardBorderRadius,
                  background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}22, transparent)`,
                  opacity: prog,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: getShimmerTop(stepShimmerStart),
                    left: 0,
                    width: "100%",
                    height: "25%",
                    background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
                    borderRadius: cardBorderRadius,
                  }}
                />
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
                      borderTop: "12px solid transparent",
                      borderBottom: "12px solid transparent",
                      borderLeft: "18px solid " + ARROW_COLOR,
                      transform: [{ scaleX: arrowProgresses[i] }],
                      transformOrigin: "left center",
                    }}
                  />
                </div>
              )}

              {/* Arrow shimmer */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: xPos + boxWidth,
                    top: boxHeight / 2 - 20,
                    width: gap,
                    height: 40,
                    background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}22, transparent)`,
                    opacity: arrowProgresses[i],
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: getShimmerTop(arrowShimmerStart),
                      left: 0,
                      width: "100%",
                      height: "30%",
                      background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
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
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      steps: ["Buys the chips", "Leases them back", "Customer pays over time"],
    }}
  />
);

// Test with 4 steps
export const ProcessFlow4StepsTest: React.FC = () => (
  <Composition
    id="ProcessFlow4StepsTest"
    component={ProcessFlow}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      steps: ["Buy AI chips", "Lease back to customers", "Customers pay monthly", "Recoup investment + profit"],
    }}
  />
);

// Test with 5 steps
export const ProcessFlow5StepsTest: React.FC = () => (
  <Composition
    id="ProcessFlow5StepsTest"
    component={ProcessFlow}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      steps: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
    }}
  />
);
