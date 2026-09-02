import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { Highlight, Circle, Underline } from "@remotion/rough-notation";
import {
  fitText,
  measureText,
} from "@remotion/layout-utils";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { useIdleMotion } from "../lib/idleMotion";

/* ------------------------------------------------------------------ */
/*  CompareSplit — VersusCard-style two-card comparison               */
/*                                                                     */
/*  Previous version was a "neutral" two-equal-card layout (per        */
/*  CLAUDE.md §3.6 list of deviating components). This rewrite         */
/*  elevates it to the VersusCard visual family:                       */
/*                                                                     */
/*    • Left card  — cool indigo accent (top bar + radial glow)        */
/*    • Right card — warm orange accent (top bar + radial glow)        */
/*    • SVG stroke-dashoffset slider border (animated draw)            */
/*    • Optional corner tags from `leftLabel` / `rightLabel` props     */
/*    • Subtle grid pattern + shimmer on each card                    */
/*                                                                     */
/*  Props are unchanged: `left`, `right`, `leftLabel?`, `rightLabel?`. */
/*  This keeps the schema in `src/beats/registry.ts` valid and lets   */
/*  LLM-generated metadata flow through unchanged.                    */
/* ------------------------------------------------------------------ */

interface CompareSplitProps {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
  emphasisWords?: string[];
  durationInFrames?: number;
}

// Google Font — type-safe, blocks rendering until the font is ready.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const ACCENT_DEEP = "#c2410c";
const DARK_TEXT = "#0f172a";
const CARD_SHADOW = "0 16px 48px rgba(15, 23, 42, 0.12), 0 6px 16px rgba(15, 23, 42, 0.06)";
const CARD_BG = "white";
const CARD_BORDER = "#e2e8f0";
const DIVIDER_COLOR = ACCENT_COLOR;
const SLIDER_COLOR = "#0f172a";
const LEFT_GLOW = "radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.10) 0%, transparent 60%)";
const RIGHT_GLOW = "radial-gradient(ellipse at 50% 0%, rgba(232, 108, 0, 0.12) 0%, transparent 60%)";
const GRID_BG = "repeating-linear-gradient(0deg, rgba(15, 23, 42, 0.03) 0, rgba(15, 23, 42, 0.03) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.03) 0, rgba(15, 23, 42, 0.03) 1px, transparent 1px, transparent 32px)";

// Rough-notation variety — cycle annotation style per emphasized word
// (mirrors the pattern in src/HeadlineCard.tsx + src/VersusCard.tsx).
const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

// Resolves a font size for `text` so it fits within `maxWidth` at the
// given font weight, capped between minFontSize and maxFontSize.
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
    fontFamily,
    fontWeight: String(fontWeight),
    maxFontSize,
    minFontSize,
  });
  let size = Math.max(minFontSize, Math.min(maxFontSize, fitted.fontSize));
  while (size > minFontSize) {
    const { width } = measureText({
      text,
      fontFamily,
      fontSize: size,
      fontWeight: String(fontWeight),
    });
    if (width <= maxWidth) break;
    size = Math.max(minFontSize, size - 4);
  }
  return size;
};

export const CompareSplit: React.FC<CompareSplitProps> = ({
  left,
  right,
  leftLabel,
  rightLabel,
  emphasisWords = [],
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — VersusCard-style cadence
  // Non-text card: entrance completes by ~28% (midpoint of 25-30%)
  // Slider starts at entranceEndFrame, runs 45%
  // ============================================
  const sideDurPct = 0.15;
  const sideStaggerPct = 0.03;
  const sliderDurPct = 0.45;

  const sideDuration = Math.round(durationInFrames * sideDurPct);
  const sideStagger = Math.round(durationInFrames * sideStaggerPct);
  const leftStart = 0;
  const rightStart = leftStart + sideStagger;
  const entranceEndFrame = rightStart + sideDuration; // ≈ 28% with defaults

  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

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
  const sliderProgress = interpolate(
    frame,
    [sliderStart, sliderStart + sliderDuration],
    [0, 1],
    { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Idle state — begins after entranceEndFrame.
  const isIdle = frame > entranceEndFrame;
  const idleTimeSeconds = isIdle ? (frame - entranceEndFrame) / fps : 0;
  const idle = useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false });
  const idleVS = isIdle ? 1 + 0.04 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.6) : 1;

  // Shimmer timing — starts after each card's entrance completes.
  const leftShimmerStart = leftStart + sideDuration;
  const rightShimmerStart = rightStart + sideDuration;
  const shimmerSpeed = 22; // % per second

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardGap = Math.max(24, width * 0.022);
  const cardWidth = (availableWidth - cardGap) / 2;
  const cardHeight = Math.min(560, height * 0.52);
  const cardBorderRadius = Math.max(24, width * 0.022);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = cardHeight;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = Math.max(32, width * 0.03);
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // VS badge in the gap between cards (mirrors VersusCard's center badge).
  const vsCircleSize = Math.max(56, width * 0.058);
  const vsFontSize = Math.max(20, width * 0.02);

  // Headline sizing — fitText + measureText guard.
  const cardPadding = Math.max(36, width * 0.034);
  const headlineMaxWidth = cardWidth - 2 * cardPadding - 8;
  const headlineMaxFontSize = Math.max(96, width * 0.085);
  const headlineMinFontSize = 48;

  const leftSize = useMemo(
    () => resolveFittedSize(left, headlineMaxWidth, headlineMaxFontSize, headlineMinFontSize, 800),
    [left, headlineMaxWidth, headlineMaxFontSize, headlineMinFontSize],
  );
  const rightSize = useMemo(
    () => resolveFittedSize(right, headlineMaxWidth, headlineMaxFontSize, headlineMinFontSize, 800),
    [right, headlineMaxWidth, headlineMaxFontSize, headlineMinFontSize],
  );

  // Tag sizing (top-left / top-right corner accent)
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
  const sliderPerimeter =
    2 * (sliderWidth + sliderHeight) -
    8 * sliderBorderRadius +
    Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  // Card transform with subtle rotation for depth (mirrors VersusCard).
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

  // === Card body shared style ===
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

  // Per-word emphasis cycle — same ANNOTATION_CYCLE as VersusCard.
  const emphasisSet = new Set(
    emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")),
  );
  let runIndex = 0;
  const advanceAnnotation = () => {
    const entry = ANNOTATION_CYCLE[runIndex % ANNOTATION_CYCLE.length];
    runIndex += 1;
    return entry;
  };

  const renderHeadlineWords = (
    text: string,
    fontSize: number,
    keyPrefix: string,
  ): React.ReactNode => {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    if (emphasisSet.size === 0) {
      return (
        <span
          style={{
            fontSize,
            fontWeight: 800,
            color: DARK_TEXT,
            fontFamily,
            lineHeight: 1.18,
            letterSpacing: -1.5,
            maxWidth: "100%",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            display: "block",
          }}
        >
          {text}
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: DARK_TEXT,
          fontFamily,
          lineHeight: 1.18,
          letterSpacing: -1.5,
          maxWidth: "100%",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.04em",
        }}
      >
        {words.map((word, i) => {
          const clean = word.toLowerCase().replace(/[.,!?;:]$/, "");
          const isEmphasized = emphasisSet.has(clean);
          const annotation = isEmphasized ? advanceAnnotation() : null;
          const content = (
            <span
              style={{
                display: "inline-block",
                ...(isEmphasized
                  ? {
                      backgroundImage: `linear-gradient(120deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }
                  : { color: DARK_TEXT }),
              }}
            >
              {word}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
          if (annotation) {
            const C = annotation.Component;
            return (
              <C
                key={`${keyPrefix}-${i}`}
                color={annotation.color}
                strokeWidth={3}
                padding={4}
                progress={1}
              >
                {content}
              </C>
            );
          }
          return <span key={`${keyPrefix}-${i}`}>{content}</span>;
        })}
      </span>
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
      {/* Slider animation - black border circling the cards (VersusCard-style) */}
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
          {/* Corner accent — top-left tag (only if leftLabel provided) */}
          {leftLabel && (
            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                fontSize: tagFontSize,
                fontWeight: 800,
                color: "#4338ca",
                fontFamily,
                letterSpacing: 2,
                textTransform: "uppercase",
                backgroundColor: "rgba(99, 102, 241, 0.10)",
                border: "1px solid rgba(99, 102, 241, 0.20)",
                padding: `${tagPaddingY}px ${tagPaddingX}px`,
                borderRadius: 999,
              }}
            >
              {leftLabel}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              flex: "1 1 auto",
              minHeight: 0,
              marginTop: leftLabel ? 28 : 0,
            }}
          >
            <div
              style={{
                fontSize: leftSize,
                fontWeight: 800,
                fontFamily,
                lineHeight: 1.18,
                letterSpacing: -1.5,
                maxWidth: "100%",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {renderHeadlineWords(left, leftSize, "l")}
            </div>
          </div>

          {/* Shimmer animation */}
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

        {/* === Center VS Badge (always present — even when labels are omitted,
              the orange dot anchors the comparison visually) === */}
        <div
          style={{
            width: vsCircleSize,
            height: vsCircleSize,
            borderRadius: "50%",
            background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
            border: `3px solid ${DIVIDER_COLOR}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            boxShadow: `0 8px 24px rgba(232, 108, 0, 0.25), 0 0 0 ${interpolate(leftProgress, [0, 1], [0, 10])}px rgba(232, 108, 0, 0.18)`,
            flexShrink: 0,
            scale: interpolate(leftProgress, [0, 1], [0.6, 1]) * idleVS,
            opacity: leftProgress,
            transformOrigin: "center",
            willChange: "transform, opacity, box-shadow",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              fontSize: vsFontSize,
              fontWeight: 900,
              color: ACCENT_DEEP,
              fontFamily,
              letterSpacing: 1.5,
              textShadow: "0 1px 2px rgba(255, 255, 255, 0.6)",
            }}
          >
            VS
          </span>
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
          {/* Corner accent — top-right tag (only if rightLabel provided) */}
          {rightLabel && (
            <div
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                fontSize: tagFontSize,
                fontWeight: 800,
                color: ACCENT_DEEP,
                fontFamily,
                letterSpacing: 2,
                textTransform: "uppercase",
                backgroundColor: "rgba(232, 108, 0, 0.10)",
                border: "1px solid rgba(232, 108, 0, 0.20)",
                padding: `${tagPaddingY}px ${tagPaddingX}px`,
                borderRadius: 999,
              }}
            >
              {rightLabel}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              flex: "1 1 auto",
              minHeight: 0,
              marginTop: rightLabel ? 28 : 0,
            }}
          >
            <div
              style={{
                fontSize: rightSize,
                fontWeight: 800,
                fontFamily,
                lineHeight: 1.18,
                letterSpacing: -1.5,
                maxWidth: "100%",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {renderHeadlineWords(right, rightSize, "r")}
            </div>
          </div>

          {/* Shimmer animation */}
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

export const CompareSplitTestComposition: React.FC = () => (
  <Composition
    id="CompareSplitTest"
    component={CompareSplit}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      left: "$50M",
      right: "$75M",
      leftLabel: "Q1",
      rightLabel: "Q2",
    }}
  />
);
