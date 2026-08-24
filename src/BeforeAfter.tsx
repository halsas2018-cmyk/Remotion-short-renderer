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

  // ============================================
  // INTERNAL TIMELINE ONLY — done by 50%
  // No entrance/exit — SceneTransition handles that
  // ============================================
  const BEFORE_DUR_PCT = 0.25;    // 0–25%: before card enters
  const AFTER_DELAY_PCT = 0.05;   // 25–30%: stagger
  const AFTER_DUR_PCT = 0.20;     // 30–50%: after card enters
  const TRANSITION_PCT = 0.50;    // 50%: transition START

  const beforeDuration = Math.round(durationInFrames * BEFORE_DUR_PCT);
  const afterStart = beforeDuration + Math.round(durationInFrames * AFTER_DELAY_PCT);
  const afterDuration = Math.round(durationInFrames * AFTER_DUR_PCT);
  const transitionStart = Math.round(durationInFrames * TRANSITION_PCT);
  const transitionDuration = Math.round(durationInFrames * 0.15); // 50–65% wipe

  // Progress (0–1 each)
  const beforeProgress = interpolate(frame, [0, beforeDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const afterProgress = interpolate(frame, [afterStart, afterStart + afterDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const transitionProgress = interpolate(frame, [transitionStart, transitionStart + transitionDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle pulse (after transition)
  const isIdle = frame > transitionStart + transitionDuration;
  const idlePulse = isIdle ? 1 + 0.02 * Math.sin(frame * 0.06) : 1;

  const padding = 120;
  const availableWidth = width - 2 * padding;
  const dividerWidth = 60;
  const cardWidth = (availableWidth - dividerWidth) / 2;
  const cardHeight = 600;

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        // Transparent background so PersistentBackground grid shows through
        backgroundColor: "transparent",
      }}
    >
      {/* 
        BeforeAfter container: centered vertically in the screen.
        Uses top: 50% + translateY(-50%) for true vertical centering.
        NO entrance/exit transforms — SceneTransition wrapper handles that.
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
            transform: [{ scaleX: transitionProgress * idlePulse }],
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
