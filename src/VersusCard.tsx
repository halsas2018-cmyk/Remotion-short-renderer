import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface VersusSide {
  label: string;
  value?: string;
}

interface VersusCardProps {
  left: VersusSide;
  right: VersusSide;
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  sideDurPct?: number;
  sideStaggerPct?: number;
  dividerDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const DIVIDER_COLOR = ACCENT_COLOR;
const CARD_BG = "white";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a"; // Black slider

export const VersusCard: React.FC<VersusCardProps> = ({
  left,
  right,
  durationInFrames: propsDurationInFrames,
  sideDurPct = 0.15,
  sideStaggerPct = 0.03,
  dividerDurPct = 0.10,
  sliderDurPct = 0.45, // Slower: 45% of duration, finishes ~70% (was 30%)
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE ONLY — completes by ~70%, then holds
  // No exit animation — this component only does internal anim
  // ============================================
  const sideDuration = Math.round(durationInFrames * sideDurPct);
  const sideStagger = Math.round(durationInFrames * sideStaggerPct);
  const leftStart = 0;
  const rightStart = leftStart + sideStagger;
  const dividerStart = leftStart + sideDuration;
  const dividerDuration = Math.round(durationInFrames * dividerDurPct);
  const sliderStart = dividerStart + dividerDuration;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress (0–1 each) — entrance animations only
  const leftProgress = interpolate(frame, [leftStart, leftStart + sideDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rightProgress = interpolate(frame, [rightStart, rightStart + sideDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dividerProgress = interpolate(frame, [dividerStart, dividerStart + dividerDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle pulse (after all entrance animations) — time-based, not frame-based
  const allAnimationsDone = dividerStart + dividerDuration;
  const isIdle = frame > allAnimationsDone;
  const idleTimeSeconds = (frame - allAnimationsDone) / fps;
  const idlePulse = isIdle ? 1 + 0.02 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.5) : 1;

  // Shimmer animation progress — starts after each card's entrance, continues during idle
  const leftShimmerStart = leftStart + sideDuration;
  const rightShimmerStart = rightStart + sideDuration;
  const shimmerSpeed = 30; // percent per second

  // Responsive sizing based on video dimensions
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const dividerWidth = Math.max(60, width * 0.055);
  const cardGap = Math.max(16, width * 0.015);
  const cardWidth = (availableWidth - dividerWidth - 2 * cardGap) / 2;
  const cardHeight = Math.min(500, height * 0.45);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = cardHeight;
  const sliderPadding = 20;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = Math.max(24, width * 0.025);
  const sliderStrokeWidth = Math.max(4, width * 0.004);

  // Responsive font sizes
  const labelFontSize = Math.max(32, width * 0.03);
  const valueFontSize = Math.max(48, width * 0.045);
  const cardBorderRadius = Math.max(16, width * 0.022);
  const dividerBorderRadius = Math.max(8, width * 0.011);
  const cardPadding = Math.max(32, width * 0.03);

  // Shimmer position calculation (0-100% top position, loops)
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%"; // Hidden before start
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  // Slider path animation - draws a rectangle around the cards using SVG stroke-dashoffset
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
      {/* Slider animation - black border circling the cards (SVG stroke animation) */}
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
          height: cardHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: cardGap,
        }}
      >
        {/* Left Card - elevated */}
        <div
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
            transformOrigin: "center right",
            transform: [
              { translateX: interpolate(leftProgress, [0, 1], [-100, 0]) },
              { scale: leftProgress },
            ],
            opacity: leftProgress,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: labelFontSize,
              fontWeight: 700,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 16,
            }}
          >
            {left.label}
          </div>
          {left.value && (
            <div
              style={{
                fontSize: valueFontSize,
                fontWeight: 800,
                color: ACCENT_COLOR,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.2,
              }}
            >
              {left.value}
            </div>
          )}

          {/* Shimmer animation - light orange sliding from top to bottom */}
          <div
            style={{
              position: "absolute",
              top: getShimmerTop(leftShimmerStart),
              left: 0,
              width: "100%",
              height: "15%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
              opacity: leftProgress,
              borderRadius: cardBorderRadius,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Center Divider - elevated */}
        <div
          style={{
            width: dividerWidth,
            height: dividerWidth,
            borderRadius: "50%",
            backgroundColor: CARD_BG,
            border: `3px solid ${DIVIDER_COLOR}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transformOrigin: "center",
            transform: [
              { scale: dividerProgress * idlePulse },
            ],
            opacity: dividerProgress,
            flexShrink: 0,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
          }}
        >
          <span
            style={{
              fontSize: Math.max(18, width * 0.017),
              fontWeight: 900,
              color: DIVIDER_COLOR,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            VS
          </span>
          {/* Moving shimmer — time-based */}
          <div
            style={{
              position: "absolute",
              top: `${(idleTimeSeconds * shimmerSpeed) % 100}%`,
              left: 0,
              width: "100%",
              height: "15%",
              background: `linear-gradient(180deg, transparent, ${DIVIDER_COLOR}44, transparent)`,
              opacity: dividerProgress,
              borderRadius: dividerBorderRadius - 2,
            }}
          />
        </div>

        {/* Right Card - elevated */}
        <div
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
            transformOrigin: "center left",
            transform: [
              { translateX: interpolate(rightProgress, [0, 1], [100, 0]) },
              { scale: rightProgress },
            ],
            opacity: rightProgress,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: labelFontSize,
              fontWeight: 700,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 16,
            }}
          >
            {right.label}
          </div>
          {right.value && (
            <div
              style={{
                fontSize: valueFontSize,
                fontWeight: 800,
                color: ACCENT_COLOR,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.2,
              }}
            >
              {right.value}
            </div>
          )}

          {/* Shimmer animation - light orange sliding from top to bottom */}
          <div
            style={{
              position: "absolute",
              top: getShimmerTop(rightShimmerStart),
              left: 0,
              width: "100%",
              height: "15%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
              opacity: rightProgress,
              borderRadius: cardBorderRadius,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const VersusCardTestComposition: React.FC = () => (
  <Composition
    id="VersusCardTest"
    component={VersusCard}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      left: { label: "Broadcom", value: "$70B debt" },
      right: { label: "Nvidia", value: "$500B exposure" },
      // durationInFrames omitted — component uses composition duration
    }}
  />
);
