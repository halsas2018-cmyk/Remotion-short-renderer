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
const TEXT_COLOR = "white";
const LABEL_COLOR = "rgba(255,255,255,0.6)";
const ACCENT_COLOR = "#FFD700";
const CARD_BG = "rgba(255,255,255,0.05)";
const CARD_BORDER = "rgba(255,255,255,0.15)";

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
  const cardWidth = (width - 2 * padding) / 2 - 20;
  const cardHeight = 600;
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {/* BEFORE Card */}
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
          }}
        >
          {/* BEFORE tag */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              fontSize: 14,
              fontWeight: 700,
              color: LABEL_COLOR,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 2,
              textTransform: "uppercase",
              backgroundColor: "rgba(255,255,255,0.05)",
              padding: "6px 12px",
              borderRadius: 4,
            }}
          >
            BEFORE
          </div>

          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: TEXT_COLOR,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.2,
              letterSpacing: -1,
            }}
          >
            {beforeLabel}
          </div>

          {/* Decorative elements for "before" state */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["Legacy", "Manual", "Slow", "Costly"].map((tag, i) => (
              <div
                key={i}
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "rgba(255,100,100,0.8)",
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: "rgba(255,100,100,0.1)",
                  border: "1px solid rgba(255,100,100,0.3)",
                  padding: "8px 16px",
                  borderRadius: 20,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Transition Divider */}
        <div
          style={{
            width: 4,
            height: cardHeight,
            background: `linear-gradient(180deg, ${ACCENT_COLOR}00, ${ACCENT_COLOR} ${idleShimmer * 50}%, ${ACCENT_COLOR}00)`,
            borderRadius: 2,
            position: "relative",
            opacity: transitionProgress > 0 ? 1 : 0,
            transform: [{ scaleX: transitionProgress }],
            transformOrigin: "center",
          }}
        >
          {/* Moving shimmer */}
          <div
            style={{
              position: "absolute",
              top: `${(frame * 0.5) % 100}%`,
              left: 0,
              width: "100%",
              height: "20%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}88, transparent)`,
              opacity: transitionProgress,
            }}
          />
        </div>

        {/* AFTER Card */}
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
          }}
        >
          {/* AFTER tag */}
          <div
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              fontSize: 14,
              fontWeight: 700,
              color: ACCENT_COLOR,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 2,
              textTransform: "uppercase",
              backgroundColor: "rgba(255,215,0,0.1)",
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid rgba(255,215,0,0.3)",
            }}
          >
            AFTER
          </div>

          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: TEXT_COLOR,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.2,
              letterSpacing: -1,
            }}
          >
            {afterLabel}
          </div>

          {/* Decorative elements for "after" state */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["Modern", "Automated", "Fast", "Efficient"].map((tag, i) => (
              <div
                key={i}
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "rgba(100,255,100,0.9)",
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: "rgba(100,255,100,0.1)",
                  border: "1px solid rgba(100,255,100,0.3)",
                  padding: "8px 16px",
                  borderRadius: 20,
                }}
              >
                {tag}
              </div>
            ))}
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
