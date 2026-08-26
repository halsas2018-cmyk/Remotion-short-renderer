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
  items?: string[];
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
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#fff4ed";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const LIGHT_TEXT = "#a3a3a3";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_SHADOW_HOVER = "0 20px 50px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08)";
const DIVIDER_COLOR = ACCENT_COLOR;
const CARD_BG = "white";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";
const DIVIDER_BG = "#fff7ed";

export const VersusCard: React.FC<VersusCardProps> = ({
  left,
  right,
  durationInFrames: propsDurationInFrames,
  // CLAUDE.md Rule 1: Non-text cards must complete entrance by 25-30% of durationInFrames
  // Defaults tuned so entranceEndFrame ≈ 28% (midpoint of 25-30%)
  sideDurPct = 0.15,        // 15% - left/right card entrance duration
  sideStaggerPct = 0.03,    // 3%  - stagger between left and right
  dividerDurPct = 0.13,     // 13% - divider entrance (15% + 13% = 28% entranceEndFrame)
  // CLAUDE.md Rule 3: Slider starts at entranceEndFrame, duration ~45%
  sliderDurPct = 0.45,      // 45% - slider border draw duration
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — CLAUDE.md compliant
  // Non-text card: entrance completes by 25-30% (target ~28%)
  // No exit animations (Rule 2) — designed for SceneTransition wrapper
  // Slider starts at entranceEndFrame, runs 45% (Rule 3)
  // ============================================
  const sideDuration = Math.round(durationInFrames * sideDurPct);
  const sideStagger = Math.round(durationInFrames * sideStaggerPct);
  const leftStart = 0;
  const rightStart = leftStart + sideStagger;
  const dividerStart = leftStart + sideDuration;
  const dividerDuration = Math.round(durationInFrames * dividerDurPct);
  
  // entranceEndFrame = when all content (cards + divider) have finished animating in
  // Target: 25-30% of durationInFrames (Rule 1 for non-text cards)
  const entranceEndFrame = dividerStart + dividerDuration; // ≈ 28% with defaults
  
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress with smoother easing
  const leftProgress = interpolate(frame, [leftStart, leftStart + sideDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rightProgress = interpolate(frame, [rightStart, rightStart + sideDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dividerProgress = interpolate(frame, [dividerStart, dividerStart + dividerDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle state — begins after entranceEndFrame (Rule 1)
  const isIdle = frame > entranceEndFrame;
  const idleTimeSeconds = isIdle ? (frame - entranceEndFrame) / fps : 0;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Shimmer timing — starts after each card's entrance completes
  const leftShimmerStart = leftStart + sideDuration;
  const rightShimmerStart = rightStart + sideDuration;
  const shimmerSpeed = 25; // % per second

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const dividerWidth = Math.max(72, width * 0.065);
  const cardGap = Math.max(20, width * 0.018);
  const cardWidth = (availableWidth - dividerWidth - 2 * cardGap) / 2;
  const cardHeight = Math.min(520, height * 0.48);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = cardHeight;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = Math.max(28, width * 0.026);
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const labelFontSize = Math.max(36, width * 0.033);
  const valueFontSize = Math.max(56, width * 0.052);
  const itemFontSize = Math.max(18, width * 0.017);
  const cardBorderRadius = Math.max(20, width * 0.0185);
  const dividerBorderRadius = Math.max(10, width * 0.009);
  const cardPadding = Math.max(40, width * 0.037);

  // Shimmer position calculation
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  // Slider path animation (SVG stroke-dashoffset)
  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  // Card transform with subtle rotation for depth
  const leftTransform = [
    { translateX: interpolate(leftProgress, [0, 1], [-80, 0]) },
    { scale: interpolate(leftProgress, [0, 1], [0.92, 1]) },
    { rotate: interpolate(leftProgress, [0, 1], [-2, 0]) },
  ];
  const rightTransform = [
    { translateX: interpolate(rightProgress, [0, 1], [80, 0]) },
    { scale: interpolate(rightProgress, [0, 1], [0.92, 1]) },
    { rotate: interpolate(rightProgress, [0, 1], [2, 0]) },
  ];

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      {/* Slider animation - black border circling the cards (Rule 3) */}
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
        {/* Left Card */}
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
            transformOrigin: "center right",
            transform: leftTransform,
            opacity: leftProgress,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
            flexShrink: 0,
          }}
        >
          {/* Accent top bar */}
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

          <div
            style={{
              fontSize: labelFontSize,
              fontWeight: 700,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 12,
              letterSpacing: -0.5,
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
                lineHeight: 1.15,
                marginBottom: left.items ? 24 : 0,
                letterSpacing: -1,
              }}
            >
              {left.value}
            </div>
          )}
          {left.items && left.items.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                width: "100%",
                marginTop: "auto",
                paddingTop: 20,
                borderTop: `1px solid ${CARD_BORDER}`,
              }}
            >
              {left.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: itemFontSize,
                    fontWeight: 500,
                    color: MEDIUM_TEXT,
                    fontFamily: "system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    backgroundColor: "#fafafa",
                    borderRadius: 12,
                    border: `1px solid ${CARD_BORDER}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: ACCENT_COLOR,
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Shimmer animation - starts after card entrance */}
          <div
            style={{
              position: "absolute",
              top: getShimmerTop(leftShimmerStart),
              left: 0,
              width: "100%",
              height: "18%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
              opacity: leftProgress,
              borderRadius: cardBorderRadius,
              pointerEvents: "none",
            }}
          />
        </article>

        {/* Center Divider */}
        <div
          style={{
            width: dividerWidth,
            height: dividerWidth,
            borderRadius: "50%",
            backgroundColor: DIVIDER_BG,
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
            boxShadow: `0 0 0 ${interpolate(dividerProgress, [0, 1], [8, 0])}px ${ACCENT_COLOR}20`,
            willChange: "transform, opacity, box-shadow",
          }}
        >
          <span
            style={{
              fontSize: Math.max(20, width * 0.0185),
              fontWeight: 900,
              color: DIVIDER_COLOR,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 1,
            }}
          >
            VS
          </span>
          {/* Moving shimmer - runs during idle */}
          <div
            style={{
              position: "absolute",
              top: isIdle ? `${(idleTimeSeconds * shimmerSpeed) % 100}%` : "-100%",
              left: 0,
              width: "100%",
              height: "15%",
              background: `linear-gradient(180deg, transparent, ${DIVIDER_COLOR}44, transparent)`,
              opacity: dividerProgress,
              borderRadius: "50%",
            }}
          />
        </div>

        {/* Right Card */}
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
            transformOrigin: "center left",
            transform: rightTransform,
            opacity: rightProgress,
            boxShadow: CARD_SHADOW,
            willChange: "transform, opacity",
            flexShrink: 0,
          }}
        >
          {/* Accent top bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, #f97316, ${ACCENT_COLOR})`,
              borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
            }}
          />

          <div
            style={{
              fontSize: labelFontSize,
              fontWeight: 700,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 12,
              letterSpacing: -0.5,
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
                lineHeight: 1.15,
                marginBottom: right.items ? 24 : 0,
                letterSpacing: -1,
              }}
            >
              {right.value}
            </div>
          )}
          {right.items && right.items.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                width: "100%",
                marginTop: "auto",
                paddingTop: 20,
                borderTop: `1px solid ${CARD_BORDER}`,
              }}
            >
              {right.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: itemFontSize,
                    fontWeight: 500,
                    color: MEDIUM_TEXT,
                    fontFamily: "system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    backgroundColor: "#fafafa",
                    borderRadius: 12,
                    border: `1px solid ${CARD_BORDER}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: ACCENT_COLOR,
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Shimmer animation - starts after card entrance */}
          <div
            style={{
              position: "absolute",
              top: getShimmerTop(rightShimmerStart),
              left: 0,
              width: "100%",
              height: "18%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
              opacity: rightProgress,
              borderRadius: cardBorderRadius,
              pointerEvents: "none",
            }}
          />
        </article>
      </div>
    </AbsoluteFill>
  );
};

export const VersusCardTestComposition: React.FC = () => (
  <Composition
    id="VersusCardTest"
    component={VersusCard}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      left: {
        label: "Broadcom",
        value: "$70B debt",
        items: ["Chip design", "Software", "Infrastructure"],
      },
      right: {
        label: "Nvidia",
        value: "$500B market cap",
        items: ["GPU monopoly", "CUDA lock-in", "Data center"],
      },
    }}
  />
);
