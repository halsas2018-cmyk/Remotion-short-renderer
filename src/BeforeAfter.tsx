import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface BeforeAfterProps {
  beforeLabel: string;
  afterLabel: string;
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const CARD_BG = "white";
const CARD_BORDER = "#e8e8e8";
const BEFORE_TAG_BG = "#fee2e2";
const BEFORE_TAG_COLOR = "#dc2626";
const BEFORE_TAG_BORDER = "#fecaca";
const AFTER_TAG_BG = "#fef3c7";
const AFTER_TAG_COLOR = "#e86c00";
const AFTER_TAG_BORDER = "#fde68a";
const BEFORE_ITEM_BG = "#fee2e2";
const BEFORE_ITEM_COLOR = "#dc2626";
const BEFORE_ITEM_BORDER = "#fecaca";
const AFTER_ITEM_BG = "#dcfce7";
const AFTER_ITEM_COLOR = "#16a34a";
const AFTER_ITEM_BORDER = "#bbf7d0";
const DIVIDER_COLOR = ACCENT_COLOR;

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeLabel,
  afterLabel,
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

  // Before card entrance
  const beforeStart = entranceFrames;
  const beforeDuration = 20;
  const beforeProgress = interpolate(frame, [beforeStart, beforeStart + beforeDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // After card entrance (staggered)
  const afterStart = beforeStart + 10;
  const afterDuration = 20;
  const afterProgress = interpolate(frame, [afterStart, afterStart + afterDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Transition/wipe animation
  const transitionStart = Math.max(beforeStart + beforeDuration, afterStart + afterDuration);
  const transitionDuration = 25;
  const transitionProgress = interpolate(frame, [transitionStart, transitionStart + transitionDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle animation: subtle shimmer on divider
  const idleShimmer = 0.5 + 0.5 * Math.sin(frame * 0.05);

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  const padding = 120;
  const availableWidth = width - 2 * padding;
  const dividerWidth = 60;
  const cardWidth = (availableWidth - dividerWidth) / 2;
  const cardHeight = 600;

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
          BeforeAfter container: centered vertically in the screen.
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
            height: cardHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
          }}
        >
          {/* BEFORE Card - elevated */}
          <div
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: 24,
              backgroundColor: CARD_BG,
              border: `2px solid ${CARD_BORDER}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: 40,
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
              transformOrigin: "center",
              transform: [
                { scale: beforeProgress },
                { translateX: interpolate(beforeProgress, [0, 1], [-60, 0]) },
              ],
              opacity: beforeProgress,
              clipPath: transitionProgress > 0 ? `inset(0 ${transitionProgress * 100}% 0 0)` : "none",
              boxShadow: CARD_SHADOW,
            }}
          >
            {/* BEFORE tag - elevated card */}
            <div
              style={{
                position: "absolute",
                top: 24,
                left: 24,
                fontSize: 14,
                fontWeight: 700,
                color: BEFORE_TAG_COLOR,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: 2,
                textTransform: "uppercase",
                backgroundColor: BEFORE_TAG_BG,
                border: `1px solid ${BEFORE_TAG_BORDER}`,
                padding: "6px 12px",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.15)",
              }}
            >
              BEFORE
            </div>

            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: DARK_TEXT,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.2,
                letterSpacing: -1,
              }}
            >
              {beforeLabel}
            </div>

            {/* Decorative elements for "before" state - elevated cards */}
            <div
              style={{
                marginTop: 40,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {["Legacy", "Manual", "Slow", "Costly"].map((tag, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: BEFORE_ITEM_COLOR,
                    fontFamily: "system-ui, sans-serif",
                    backgroundColor: BEFORE_ITEM_BG,
                    border: `1px solid ${BEFORE_ITEM_BORDER}`,
                    padding: "8px 16px",
                    borderRadius: 20,
                    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>

          {/* Transition Divider - elevated */}
          <div
            style={{
              width: dividerWidth,
              height: cardHeight,
              borderRadius: 12,
              backgroundColor: CARD_BG,
              border: `2px solid ${DIVIDER_COLOR}`,
              position: "relative",
              opacity: transitionProgress > 0 ? 1 : 0,
              transform: [{ scaleX: transitionProgress }],
              transformOrigin: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: CARD_SHADOW,
            }}
          >
            {/* Arrow indicator */}
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: "12px solid transparent",
                borderBottom: "12px solid transparent",
                borderLeft: "18px solid " + DIVIDER_COLOR,
                filter: "drop-shadow(0 0 8px rgba(232, 108, 0, 0.4))",
              }}
            />
            {/* Moving shimmer */}
            <div
              style={{
                position: "absolute",
                top: `${(frame * 0.5) % 100}%`,
                left: 0,
                width: "100%",
                height: "15%",
                background: `linear-gradient(180deg, transparent, ${DIVIDER_COLOR}44, transparent)`,
                opacity: transitionProgress,
                borderRadius: 10,
              }}
            />
          </div>

          {/* AFTER Card - elevated */}
          <div
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: 24,
              backgroundColor: CARD_BG,
              border: `2px solid ${CARD_BORDER}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: 40,
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
              transformOrigin: "center",
              transform: [
                { scale: afterProgress },
                { translateX: interpolate(afterProgress, [0, 1], [60, 0]) },
              ],
              opacity: afterProgress,
              clipPath: transitionProgress > 0 ? `inset(0 0 0 ${transitionProgress * 100}%)` : "none",
              boxShadow: CARD_SHADOW,
            }}
          >
            {/* AFTER tag - elevated card */}
            <div
              style={{
                position: "absolute",
                top: 24,
                right: 24,
                fontSize: 14,
                fontWeight: 700,
                color: AFTER_TAG_COLOR,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: 2,
                textTransform: "uppercase",
                backgroundColor: AFTER_TAG_BG,
                border: `1px solid ${AFTER_TAG_BORDER}`,
                padding: "6px 12px",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(232, 108, 0, 0.15)",
              }}
            >
              AFTER
            </div>

            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: DARK_TEXT,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.2,
                letterSpacing: -1,
              }}
            >
              {afterLabel}
            </div>

            {/* Decorative elements for "after" state - elevated cards */}
            <div
              style={{
                marginTop: 40,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {["Modern", "Automated", "Fast", "Efficient"].map((tag, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: AFTER_ITEM_COLOR,
                    fontFamily: "system-ui, sans-serif",
                    backgroundColor: AFTER_ITEM_BG,
                    border: `1px solid ${AFTER_ITEM_BORDER}`,
                    padding: "8px 16px",
                    borderRadius: 20,
                    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.1)",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BeforeAfterTestComposition: React.FC = () => (
  <Composition
    id="BeforeAfterTest"
    component={BeforeAfter}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      beforeLabel: "Manual Chip Procurement",
      afterLabel: "Automated Lease-Back Model",
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
