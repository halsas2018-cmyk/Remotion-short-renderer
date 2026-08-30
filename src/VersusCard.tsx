import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import {
  fitText,
  measureText,
} from "@remotion/layout-utils";
import { useIdleMotion } from "./lib/idleMotion";

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
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const ACCENT_DEEP = "#c2410c";
const DARK_TEXT = "#0f172a";
const MEDIUM_TEXT = "#475569";
const LIGHT_TEXT = "#94a3b8";
const CARD_SHADOW = "0 16px 48px rgba(15, 23, 42, 0.12), 0 6px 16px rgba(15, 23, 42, 0.06)";
const CARD_BG = "white";
const CARD_BORDER = "#e2e8f0";
const DIVIDER_COLOR = ACCENT_COLOR;
const SLIDER_COLOR = "#0f172a";
const DIVIDER_BG = "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)";
const LEFT_GLOW = "radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.10) 0%, transparent 60%)";
const RIGHT_GLOW = "radial-gradient(ellipse at 50% 0%, rgba(232, 108, 0, 0.12) 0%, transparent 60%)";
const GRID_BG = "repeating-linear-gradient(0deg, rgba(15, 23, 42, 0.03) 0, rgba(15, 23, 42, 0.03) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.03) 0, rgba(15, 23, 42, 0.03) 1px, transparent 1px, transparent 32px)";

// Resolves a font size for `text` so it fits within `maxWidth` at the
// given font weight, capped between minFontSize and maxFontSize.
// (See .agents/skills/remotion-markup/measuring-text.md)
const resolveFittedSize = (
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  fontWeight: 600 | 700 | 800,
): number => {
  if (!text) return minFontSize;
  const fitted = fitText({
    text,
    withinWidth: maxWidth,
    fontFamily: "system-ui, sans-serif",
    fontWeight: String(fontWeight),
    maxFontSize,
    minFontSize,
  });
  // Guard against fitText picking a font size that wraps the text by
  // also running a width check via measureText. If the fitted size
  // would still overflow, drop it 4px at a time.
  let size = Math.max(minFontSize, Math.min(maxFontSize, fitted.fontSize));
  while (size > minFontSize) {
    const { width } = measureText({
      text,
      fontFamily: "system-ui, sans-serif",
      fontSize: size,
      fontWeight: String(fontWeight),
    });
    if (width <= maxWidth) break;
    size = Math.max(minFontSize, size - 4);
  }
  return size;
};

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
    easing: easeInOut,
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
  const idle = useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false });
  const idleVS = isIdle ? 1 + 0.04 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.6) : 1;

  // Shimmer timing — starts after each card's entrance completes
  const leftShimmerStart = leftStart + sideDuration;
  const rightShimmerStart = rightStart + sideDuration;
  const shimmerSpeed = 22; // % per second

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const dividerWidth = Math.max(96, width * 0.085);
  const cardGap = Math.max(20, width * 0.018);
  const cardWidth = (availableWidth - dividerWidth - 2 * cardGap) / 2;
  const cardHeight = Math.min(560, height * 0.52);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = cardHeight;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = Math.max(32, width * 0.03);
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // ============================================
  // Fitted font sizes — using measureText / fitText
  // (per .agents/skills/remotion-markup/measuring-text.md)
  // ============================================
  const cardPadding = Math.max(36, width * 0.034);
  const headlineMaxWidth = cardWidth - 2 * cardPadding - 8;
  const valueMaxWidth = headlineMaxWidth;

  const labelMaxFontSize = Math.max(40, width * 0.036);
  const labelMinFontSize = 28;
  const valueMaxFontSize = Math.max(60, width * 0.056);
  const valueMinFontSize = 36;
  const itemMaxFontSize = Math.max(20, width * 0.018);
  const itemMinFontSize = 16;

  const leftLabelSize = useMemo(
    () => resolveFittedSize(left.label, headlineMaxWidth, labelMaxFontSize, labelMinFontSize, 700),
    [left.label, headlineMaxWidth, labelMaxFontSize, labelMinFontSize],
  );
  const rightLabelSize = useMemo(
    () => resolveFittedSize(right.label, headlineMaxWidth, labelMaxFontSize, labelMinFontSize, 700),
    [right.label, headlineMaxWidth, labelMaxFontSize, labelMinFontSize],
  );
  const leftValueSize = useMemo(
    () => resolveFittedSize(left.value ?? "", valueMaxWidth, valueMaxFontSize, valueMinFontSize, 800),
    [left.value, valueMaxWidth, valueMaxFontSize, valueMinFontSize],
  );
  const rightValueSize = useMemo(
    () => resolveFittedSize(right.value ?? "", valueMaxWidth, valueMaxFontSize, valueMinFontSize, 800),
    [right.value, valueMaxWidth, valueMaxFontSize, valueMinFontSize],
  );

  // Static responsive sizes
  const itemFontSize = itemMaxFontSize;
  const cardBorderRadius = Math.max(24, width * 0.022);
  const vsCircleSize = dividerWidth * 0.9;
  const vsFontSize = Math.max(22, width * 0.022);
  const tagFontSize = Math.max(11, width * 0.011);
  const tagPaddingX = Math.max(10, width * 0.01);
  const tagPaddingY = Math.max(4, height * 0.0025);

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
    { translateY: idle.translateY },
    { rotateX: idle.rotateX },
  ];
  const rightTransform = [
    { translateX: interpolate(rightProgress, [0, 1], [80, 0]) },
    { scale: interpolate(rightProgress, [0, 1], [0.92, 1]) },
    { rotate: interpolate(rightProgress, [0, 1], [2, 0]) },
    { translateY: idle.translateY },
    { rotateX: idle.rotateX },
  ];

  // === Card body shared style — extracted so we can keep left/right in sync ===
  const cardBodyBase: React.CSSProperties = {
    width: cardWidth,
    height: cardHeight,
    borderRadius: cardBorderRadius,
    backgroundColor: CARD_BG,
    border: `1.5px solid ${CARD_BORDER}`,
    display: "flex",
    flexDirection: "column",
    padding: cardPadding,
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
    boxShadow: CARD_SHADOW,
    willChange: "transform, opacity",
    flexShrink: 0,
    backdropFilter: "blur(0.5px)",
  };

  // === Item row subcomponent (local) — uniform row with leading dot ===
  const renderItems = (
    items: string[] | undefined,
    color: string,
    bg: string,
    border: string,
  ) => {
    if (!items || items.length === 0) return null;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: "100%",
          marginTop: "auto",
          paddingTop: 16,
          borderTop: `1px dashed ${CARD_BORDER}`,
        }}
      >
        {items.map((item, i) => (
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
              padding: `${tagPaddingY + 4}px ${tagPaddingX + 4}px`,
              backgroundColor: bg,
              borderRadius: 12,
              border: `1px solid ${border}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
                flexShrink: 0,
              }}
            />
            {item}
          </div>
        ))}
      </div>
    );
  };

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
          filter: "drop-shadow(0 0 24px rgba(15, 23, 42, 0.18))",
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
        {/* === Left Card === */}
        <article
          style={{
            ...cardBodyBase,
            backgroundImage: `${LEFT_GLOW}, ${GRID_BG}`,
            transformOrigin: "center right",
            transform: leftTransform,
            opacity: leftProgress,
          }}
        >
          {/* Accent top bar (cool, indigo) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              background:
                "linear-gradient(90deg, #6366f1 0%, #818cf8 50%, #c7d2fe 100%)",
              borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
            }}
          />
          {/* Corner accent — top-left ribbon */}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              fontSize: tagFontSize,
              fontWeight: 800,
              color: "#4338ca",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 2,
              textTransform: "uppercase",
              backgroundColor: "rgba(99, 102, 241, 0.10)",
              border: "1px solid rgba(99, 102, 241, 0.20)",
              padding: `${tagPaddingY}px ${tagPaddingX}px`,
              borderRadius: 999,
            }}
          >
            Option A
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 8,
              flex: "1 1 auto",
              minHeight: 0,
              marginTop: 28,
            }}
          >
            <div
              style={{
                fontSize: leftLabelSize,
                fontWeight: 700,
                color: DARK_TEXT,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: -0.8,
                lineHeight: 1.1,
                maxWidth: "100%",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {left.label}
            </div>
            {left.value && (
              <div
                style={{
                  fontSize: leftValueSize,
                  fontWeight: 800,
                  color: ACCENT_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.1,
                  letterSpacing: -1.5,
                  maxWidth: "100%",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  textShadow: "0 2px 12px rgba(232, 108, 0, 0.18)",
                }}
              >
                {left.value}
              </div>
            )}
          </div>

          {renderItems(
            left.items,
            "#6366f1",
            "rgba(99, 102, 241, 0.06)",
            "rgba(99, 102, 241, 0.18)",
          )}

          {/* Shimmer animation - light orange sliding from top to bottom */}
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

        {/* === Center VS Badge === */}
        <div
          style={{
            width: dividerWidth,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: dividerProgress,
            transform: [
              { scale: interpolate(dividerProgress, [0, 1], [0.6, 1]) * idleVS },
            ],
            transformOrigin: "center",
            willChange: "transform, opacity",
          }}
        >
          {/* Vertical guide line above the badge */}
          <div
            style={{
              width: 2,
              height: Math.max(60, height * 0.04),
              background: `linear-gradient(180deg, transparent 0%, ${DIVIDER_COLOR}80 100%)`,
              marginBottom: -2,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              width: vsCircleSize,
              height: vsCircleSize,
              borderRadius: "50%",
              background: DIVIDER_BG,
              border: `3px solid ${DIVIDER_COLOR}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
              boxShadow: `0 0 0 ${interpolate(dividerProgress, [0, 1], [0, 10])}px rgba(232, 108, 0, 0.18), 0 8px 24px rgba(232, 108, 0, 0.25)`,
              willChange: "box-shadow, transform",
            }}
          >
            <span
              style={{
                fontSize: vsFontSize,
                fontWeight: 900,
                color: ACCENT_DEEP,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: 1.5,
                textShadow: "0 1px 2px rgba(255, 255, 255, 0.6)",
              }}
            >
              VS
            </span>
            {/* Inner ring */}
            <div
              style={{
                position: "absolute",
                inset: 6,
                borderRadius: "50%",
                border: `1px dashed ${ACCENT_COLOR}66`,
                pointerEvents: "none",
              }}
            />
          </div>
          {/* Vertical guide line below the badge */}
          <div
            style={{
              width: 2,
              height: Math.max(60, height * 0.04),
              background: `linear-gradient(0deg, transparent 0%, ${DIVIDER_COLOR}80 100%)`,
              marginTop: -2,
              borderRadius: 2,
            }}
          />
        </div>

        {/* === Right Card === */}
        <article
          style={{
            ...cardBodyBase,
            backgroundImage: `${RIGHT_GLOW}, ${GRID_BG}`,
            transformOrigin: "center left",
            transform: rightTransform,
            opacity: rightProgress,
          }}
        >
          {/* Accent top bar (warm, orange) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              background: `linear-gradient(90deg, #fed7aa 0%, ${ACCENT_LIGHT} 50%, ${ACCENT_COLOR} 100%)`,
              borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
            }}
          />
          {/* Corner accent — top-right ribbon */}
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              fontSize: tagFontSize,
              fontWeight: 800,
              color: ACCENT_DEEP,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 2,
              textTransform: "uppercase",
              backgroundColor: "rgba(232, 108, 0, 0.10)",
              border: "1px solid rgba(232, 108, 0, 0.20)",
              padding: `${tagPaddingY}px ${tagPaddingX}px`,
              borderRadius: 999,
            }}
          >
            Option B
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 8,
              flex: "1 1 auto",
              minHeight: 0,
              marginTop: 28,
            }}
          >
            <div
              style={{
                fontSize: rightLabelSize,
                fontWeight: 700,
                color: DARK_TEXT,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: -0.8,
                lineHeight: 1.1,
                maxWidth: "100%",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {right.label}
            </div>
            {right.value && (
              <div
                style={{
                  fontSize: rightValueSize,
                  fontWeight: 800,
                  color: ACCENT_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.1,
                  letterSpacing: -1.5,
                  maxWidth: "100%",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  textShadow: "0 2px 12px rgba(232, 108, 0, 0.18)",
                }}
              >
                {right.value}
              </div>
            )}
          </div>

          {renderItems(
            right.items,
            ACCENT_COLOR,
            "rgba(232, 108, 0, 0.06)",
            "rgba(232, 108, 0, 0.18)",
          )}

          {/* Shimmer animation - light orange sliding from top to bottom */}
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
