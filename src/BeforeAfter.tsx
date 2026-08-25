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
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  beforeDurPct?: number;
  afterDelayPct?: number;
  afterDurPct?: number;
  dividerDurPct?: number;
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

// Helper to calculate responsive headline font size based on text length and available height
const calculateHeadlineFontSize = (text: string, cardHeight: number, cardPadding: number, width: number): number => {
  const baseFontSize = Math.max(84, width * 0.078);
  const charCount = text.length;
  const estimatedLines = Math.max(1, Math.ceil(charCount / 28));
  const lineHeight = 1.2;
  const tagHeight = 40;
  const bottomTagsHeight = 60;
  const availableHeight = cardHeight - 2 * cardPadding - tagHeight - bottomTagsHeight - 40;
  const maxFontSizeForHeight = availableHeight / (estimatedLines * lineHeight);
  return Math.min(baseFontSize, Math.max(48, maxFontSizeForHeight));
};

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeLabel,
  afterLabel,
  durationInFrames: propsDurationInFrames,
  beforeDurPct = 0.15,
  afterDelayPct = 0.03,
  afterDurPct = 0.10,
  dividerDurPct = 0.10,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE ONLY — entrance animations complete by ~30%, then hold
  // NO transition/wipe — both cards stay visible
  // ============================================
  const beforeDuration = Math.round(durationInFrames * beforeDurPct);
  const afterStart = beforeDuration + Math.round(durationInFrames * afterDelayPct);
  const afterDuration = Math.round(durationInFrames * afterDurPct);
  const dividerStart = afterStart + afterDuration;
  const dividerDuration = Math.round(durationInFrames * dividerDurPct);

  // Progress (0–1 each) — entrance animations only
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
  const dividerProgress = interpolate(frame, [dividerStart, dividerStart + dividerDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle pulse (after all entrance animations) — time-based, not frame-based
  const allAnimationsDone = dividerStart + dividerDuration;
  const isIdle = frame > allAnimationsDone;
  const idleTimeSeconds = (frame - allAnimationsDone) / fps;
  const idlePulse = isIdle ? 1 + 0.02 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.5) : 1;

  // Card slide-in complete progress (for triggering scaleX animation)
  const beforeSlideDone = interpolate(frame, [beforeDuration, beforeDuration + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const afterSlideDone = interpolate(frame, [afterStart + afterDuration, afterStart + afterDuration + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ScaleX progress for cards (starts after slide-in, uses dividerProgress timing)
  const cardScaleXProgress = dividerProgress;

  // Responsive sizing based on video dimensions
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const dividerWidth = Math.max(40, width * 0.055);
  const cardGap = Math.max(16, width * 0.015); // Gap between cards and divider
  const cardWidth = (availableWidth - dividerWidth - 2 * cardGap) / 2;
  const cardHeight = Math.min(600, height * 0.55);

  // Responsive font sizes
  const tagFontSize = Math.max(14, width * 0.013);
  const tagPaddingX = Math.max(12, width * 0.011);
  const tagPaddingY = Math.max(6, height * 0.003);
  const itemFontSize = Math.max(16, width * 0.015);
  const itemPaddingX = Math.max(16, width * 0.015);
  const itemPaddingY = Math.max(8, height * 0.004);
  const cardBorderRadius = Math.max(16, width * 0.022);
  const dividerBorderRadius = Math.max(8, width * 0.011);
  const cardPadding = Math.max(32, width * 0.03);

  // Calculate headline font sizes per label to fit in card
  const beforeHeadlineFontSize = calculateHeadlineFontSize(beforeLabel, cardHeight, cardPadding, width);
  const afterHeadlineFontSize = calculateHeadlineFontSize(afterLabel, cardHeight, cardPadding, width);

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
          transform: "translateY(-50%)",
          width: availableWidth,
          height: cardHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: cardGap,
        }}
      >
        {/* BEFORE Card - elevated */}
        <article
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: cardBorderRadius,
            backgroundColor: CARD_BG,
            border: `2px solid ${CARD_BORDER}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: cardPadding,
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            transformOrigin: "center",
            transform: [
              { scale: beforeProgress },
              { translateX: interpolate(beforeProgress, [0, 1], [-60, 0]) },
              // Add scaleX animation (sliding from center) after slide-in completes
              { scaleX: interpolate(beforeSlideDone, [0, 1], [0, cardScaleXProgress * idlePulse]) },
            ],
            opacity: beforeProgress,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
            flexShrink: 0,
          }}
          aria-label={`Before: ${beforeLabel}`}
        >
          {/* BEFORE tag - elevated card */}
          <div
            style={{
              position: "absolute",
              top: tagPaddingY,
              left: tagPaddingX,
              fontSize: tagFontSize,
              fontWeight: 700,
              color: BEFORE_TAG_COLOR,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 2,
              textTransform: "uppercase",
              backgroundColor: BEFORE_TAG_BG,
              border: `1px solid ${BEFORE_TAG_BORDER}`,
              padding: `${tagPaddingY}px ${tagPaddingX}px`,
              borderRadius: 4,
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.15)",
            }}
            role="label"
          >
            BEFORE
          </div>

          <div
            style={{
              fontSize: beforeHeadlineFontSize,
              fontWeight: 800,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.2,
              letterSpacing: -1,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              maxWidth: "100%",
              flex: "1 1 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              flexShrink: 0,
            }}
          >
            {["Legacy", "Manual", "Slow", "Costly"].map((tag, i) => (
              <div
                key={i}
                style={{
                  fontSize: itemFontSize,
                  fontWeight: 600,
                  color: BEFORE_ITEM_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: BEFORE_ITEM_BG,
                  border: `1px solid ${BEFORE_ITEM_BORDER}`,
                  padding: `${itemPaddingY}px ${itemPaddingX}px`,
                  borderRadius: 20,
                  boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </article>

        {/* Divider - elevated */}
        <div
          style={{
            width: dividerWidth,
            height: cardHeight,
            borderRadius: dividerBorderRadius,
            backgroundColor: CARD_BG,
            border: `2px solid ${DIVIDER_COLOR}`,
            position: "relative",
            opacity: dividerProgress,
            transform: [{ scaleX: dividerProgress * idlePulse }],
            transformOrigin: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
          }}
          aria-hidden="true"
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
          {/* Moving shimmer — time-based */}
          <div
            style={{
              position: "absolute",
              top: `${(idleTimeSeconds * 30) % 100}%`,
              left: 0,
              width: "100%",
              height: "15%",
              background: `linear-gradient(180deg, transparent, ${DIVIDER_COLOR}44, transparent)`,
              opacity: dividerProgress,
              borderRadius: dividerBorderRadius - 2,
            }}
          />
        </div>

        {/* AFTER Card - elevated */}
        <article
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: cardBorderRadius,
            backgroundColor: CARD_BG,
            border: `2px solid ${CARD_BORDER}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: cardPadding,
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            transformOrigin: "center",
            transform: [
              { scale: afterProgress },
              { translateX: interpolate(afterProgress, [0, 1], [60, 0]) },
              // Add scaleX animation (sliding from center) after slide-in completes
              { scaleX: interpolate(afterSlideDone, [0, 1], [0, cardScaleXProgress * idlePulse]) },
            ],
            opacity: afterProgress,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
            flexShrink: 0,
          }}
          aria-label={`After: ${afterLabel}`}
        >
          {/* AFTER tag - elevated card */}
          <div
            style={{
              position: "absolute",
              top: tagPaddingY,
              right: tagPaddingX,
              fontSize: tagFontSize,
              fontWeight: 700,
              color: AFTER_TAG_COLOR,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 2,
              textTransform: "uppercase",
              backgroundColor: AFTER_TAG_BG,
              border: `1px solid ${AFTER_TAG_BORDER}`,
              padding: `${tagPaddingY}px ${tagPaddingX}px`,
              borderRadius: 4,
              boxShadow: "0 2px 8px rgba(232, 108, 0, 0.15)",
            }}
            role="label"
          >
            AFTER
          </div>

          <div
            style={{
              fontSize: afterHeadlineFontSize,
              fontWeight: 800,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.2,
              letterSpacing: -1,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              maxWidth: "100%",
              flex: "1 1 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              flexShrink: 0,
            }}
          >
            {["Modern", "Automated", "Fast", "Efficient"].map((tag, i) => (
              <div
                key={i}
                style={{
                  fontSize: itemFontSize,
                  fontWeight: 600,
                  color: AFTER_ITEM_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: AFTER_ITEM_BG,
                  border: `1px solid ${AFTER_ITEM_BORDER}`,
                  padding: `${itemPaddingY}px ${itemPaddingX}px`,
                  borderRadius: 20,
                  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.1)",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </article>
      </div>
    </AbsoluteFill>
  );
};

// Single test composition: 90 frames at 30fps = 3 seconds
export const BeforeAfterTest: React.FC = () => (
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
    }}
  />
);
