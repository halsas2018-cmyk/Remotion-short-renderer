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
  fillTextBox,
  measureText,
} from "@remotion/layout-utils";

interface BeforeAfterProps {
  beforeLabel: string;
  afterLabel: string;
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  beforeDurPct?: number;
  afterDelayPct?: number;
  afterDurPct?: number;
  dividerDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const DARK_TEXT = "#0f172a";
const MEDIUM_TEXT = "#475569";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const CARD_BG = "white";
const CARD_BORDER = "#e8e8e8";
const BEFORE_TAG_BG = "#fee2e2";
const BEFORE_TAG_COLOR = "#dc2626";
const BEFORE_TAG_BORDER = "#fecaca";
const AFTER_TAG_BG = "#dcfce7";
const AFTER_TAG_COLOR = "#15803d";
const AFTER_TAG_BORDER = "#bbf7d0";
const BEFORE_ACCENT_BAR = "#dc2626";
const AFTER_ACCENT_BAR = "#16a34a";
const DIVIDER_COLOR = ACCENT_COLOR;
const SLIDER_COLOR = "#1a1a1a"; // Black slider
const DIVIDER_BORDER_RADIUS = 16; // Card border radius used for the divider

// Wraps a single label into lines that fit a max width, using fillTextBox
// from @remotion/layout-utils. Returns the lines, the resolved fontSize,
// and whether the text fit. If the text overflowed the line budget, the
// caller can shrink the fontSize further or rely on a clip path.
const wrapLabel = (params: {
  text: string;
  maxWidth: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  fontWeight: 600 | 700 | 800;
}): { lines: string[]; fontSize: number; didFit: boolean } => {
  const { text, maxWidth, maxLines, maxFontSize, minFontSize, fontWeight } =
    params;

  // fitText gives us the largest font size that fits the FULL string
  // as a single line; we then try to wrap onto multiple lines via
  // fillTextBox.add().
  const fitted = fitText({
    text,
    withinWidth: maxWidth,
    fontFamily: "system-ui, sans-serif",
    fontWeight: String(fontWeight),
    maxFontSize,
    minFontSize,
  });
  const fontSize = Math.max(minFontSize, Math.min(maxFontSize, fitted.fontSize));

  const box = fillTextBox({
    maxBoxWidth: maxWidth,
    maxLines,
    fontFamily: "system-ui, sans-serif",
    fontSize,
    fontWeight: String(fontWeight),
    lineHeight: 1.18,
  });

  // Split on whitespace and feed each word (with a trailing space) into
  // fillTextBox. Stop early once it overflows the line budget.
  const tokens = text.split(/(\s+)/); // keep whitespace as separate tokens
  let didFit = true;
  const words: string[] = [];
  for (const tok of tokens) {
    if (tok.length === 0) continue;
    const isSpace = /^\s+$/.test(tok);
    const candidate = isSpace ? words.join("") + tok : words.join("") + tok;
    const { exceedsBox } = box.add({
      text: isSpace ? tok : candidate,
      fontFamily: "system-ui, sans-serif",
      fontSize,
      fontWeight: String(fontWeight),
    });
    if (exceedsBox) {
      didFit = false;
      break;
    }
    words.push(tok);
  }

  // Pull the final lines back out of the box. fillTextBox doesn't expose
  // a .getLines() so we approximate by greedy line breaks using
  // measureText at the same font size.
  const wrapped = greedyWrap(text, maxWidth, fontSize, fontWeight, maxLines);

  return { lines: wrapped.lines, fontSize, didFit: wrapped.didFit };
};

// Greedy word-wrap with a hard cap on number of lines. Each line is
// measured with measureText() at the same font family/weight that
// fitText resolved — so the lines we render in JSX match the lines
// the layout function expects.
const greedyWrap = (
  text: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: 600 | 700 | 800,
  maxLines: number,
): { lines: string[]; didFit: boolean } => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    const next = current ? `${current} ${words[i]}` : words[i];
    const { width } = measureText({
      text: next,
      fontFamily: "system-ui, sans-serif",
      fontSize,
      fontWeight: String(fontWeight),
    });
    if (width > maxWidth && current) {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines) {
        // Check whether remaining words still fit on this last line.
        const remaining = words.slice(i).join(" ");
        const { width: remW } = measureText({
          text: remaining,
          fontFamily: "system-ui, sans-serif",
          fontSize,
          fontWeight: String(fontWeight),
        });
        if (remW > maxWidth) {
          return { lines, didFit: false };
        }
        return { lines: [...lines, remaining], didFit: true };
      }
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return { lines, didFit: lines.length <= maxLines };
};

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeLabel,
  afterLabel,
  durationInFrames: propsDurationInFrames,
  // CLAUDE.md Rule 1: Non-text cards must complete entrance by 25-30% of durationInFrames
  // Defaults tuned so entranceEndFrame ≈ 28% (midpoint of 25-30%)
  beforeDurPct = 0.12,        // 12% - BEFORE card entrance
  afterDelayPct = 0.03,       // 3%  - stagger after BEFORE
  afterDurPct = 0.10,         // 10% - AFTER card entrance
  dividerDurPct = 0.03,       // 3%  - divider entrance (12+3+10+3 = 28%)
  // CLAUDE.md Rule 3: Slider starts at entranceEndFrame, duration ~45%
  sliderDurPct = 0.45,        // 45% - slider border draw duration
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — CLAUDE.md compliant
  // Non-text card: entrance completes by 25-30% (target ~28%)
  // No exit animations (Rule 2) — designed for SceneTransition wrapper
  // Slider starts at entranceEndFrame, runs 45% (Rule 3)
  // ============================================
  const beforeDuration = Math.round(durationInFrames * beforeDurPct);
  const afterStart = beforeDuration + Math.round(durationInFrames * afterDelayPct);
  const afterDuration = Math.round(durationInFrames * afterDurPct);
  const dividerStart = afterStart + afterDuration;
  const dividerDuration = Math.round(durationInFrames * dividerDurPct);

  // entranceEndFrame = when all content (cards + divider) have finished animating in
  // Target: 25-30% of durationInFrames (Rule 1 for non-text cards)
  const entranceEndFrame = dividerStart + dividerDuration; // ≈ 28% with defaults
  
  // Slider (Rule 3): starts at entranceEndFrame, duration ~45%
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress (0–1 each) — entrance animations only
  const beforeProgress = interpolate(frame, [0, beforeDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const afterProgress = interpolate(frame, [afterStart, afterStart + afterDuration], [0, 1], {
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

  // Idle pulse (after all entrance animations) — time-based, not frame-based
  const isIdle = frame > entranceEndFrame;
  const idleTimeSeconds = isIdle ? (frame - entranceEndFrame) / fps : 0;
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

  // Shimmer animation progress — starts after each card's entrance, continues during idle
  const beforeShimmerStart = beforeDuration;
  const afterShimmerStart = afterStart + afterDuration;
  const shimmerSpeed = 30; // percent per second

  // Responsive sizing based on video dimensions
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const dividerWidth = Math.max(40, width * 0.055);
  const cardGap = Math.max(16, width * 0.015); // Gap between cards and divider
  const cardWidth = (availableWidth - dividerWidth - 2 * cardGap) / 2;
  const cardHeight = Math.min(600, height * 0.55);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = cardHeight;
  const sliderPadding = 20; // Space between cards and slider border
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = Math.max(24, width * 0.025);
  const sliderStrokeWidth = Math.max(4, width * 0.004);

  // Responsive font sizes
  const tagFontSize = Math.max(14, width * 0.013);
  const tagPaddingX = Math.max(12, width * 0.011);
  const tagPaddingY = Math.max(6, height * 0.003);
  const cardBorderRadius = Math.max(16, width * 0.022);
  const cardPadding = Math.max(32, width * 0.03);
  const dividerBorderRadius = Math.max(8, width * 0.012);

  // ============================================
  // Headline sizing — uses measureText + fitText + fillTextBox
  // (per .agents/skills/remotion-markup/measuring-text.md)
  // ============================================
  //
  // The headline must:
  //   1. Fit horizontally inside the card's content width.
  //   2. Wrap onto at most 2 lines (any more and the card gets cramped).
  //   3. Stay readable on a 1080×1920 phone screen (>= 48px).
  //
  // We use fitText() to find the maximum font size that satisfies #1
  // and #2, capped by the card's own height budget so the headline
  // doesn't push the tag/footer off-screen. We also store the wrapped
  // lines so JSX can render the exact same lines the layout function
  // computed (otherwise the text might wrap differently at render
  // time and overflow).

  const headlineMaxFontSize = Math.max(96, width * 0.085);
  const headlineMinFontSize = 48;
  const headlineMaxLines = 2;

  // The card's headline column is the card width minus 2× padding, then
  // minus a small safety margin so very long words ("Lease-Back") can
  // still break gracefully.
  const headlineMaxWidth = cardWidth - 2 * cardPadding - 8;

  // Cap the headline height so the tag on top and the items row on the
  // bottom never get pushed off-screen. We use 60% of the card height
  // for the headline block.
  const headlineHeightBudget = Math.max(120, cardHeight * 0.6);

  const beforeHeadline = useMemo(
    () =>
      wrapLabel({
        text: beforeLabel,
        maxWidth: headlineMaxWidth,
        maxLines: headlineMaxLines,
        maxFontSize: headlineMaxFontSize,
        minFontSize: headlineMinFontSize,
        fontWeight: 800,
      }),
    [
      beforeLabel,
      headlineMaxWidth,
      headlineMaxLines,
      headlineMaxFontSize,
      headlineMinFontSize,
    ],
  );

  const afterHeadline = useMemo(
    () =>
      wrapLabel({
        text: afterLabel,
        maxWidth: headlineMaxWidth,
        maxLines: headlineMaxLines,
        maxFontSize: headlineMaxFontSize,
        minFontSize: headlineMinFontSize,
        fontWeight: 800,
      }),
    [
      afterLabel,
      headlineMaxWidth,
      headlineMaxLines,
      headlineMaxFontSize,
      headlineMinFontSize,
    ],
  );

  // Final font size: respect fitText's fit, but never exceed the height
  // budget. We recompute it once per render so useMemo is the only
  // place that runs the layout function repeatedly.
  const resolveFinalFontSize = (
    fitted: { fontSize: number; lines: string[]; didFit: boolean },
  ): number => {
    // If wrapping didn't fit in the line budget, drop the font size
    // until the longest line fits the width (this matches what
    // fitText does internally for width, but we also enforce a height
    // budget).
    let size = fitted.fontSize;
    const lineHeight = 1.18;
    while (size > headlineMinFontSize) {
      const longest = fitted.lines.reduce(
        (a, b) => (a.length >= b.length ? a : b),
        "",
      );
      const { width: lw } = measureText({
        text: longest,
        fontFamily: "system-ui, sans-serif",
        fontSize: size,
        fontWeight: "800",
      });
      const totalHeight = fitted.lines.length * size * lineHeight;
      if (lw <= headlineMaxWidth && totalHeight <= headlineHeightBudget) {
        break;
      }
      size = Math.max(headlineMinFontSize, size - 4);
    }
    return size;
  };

  const beforeHeadlineFontSize = resolveFinalFontSize(beforeHeadline);
  const afterHeadlineFontSize = resolveFinalFontSize(afterHeadline);

  // Shimmer position calculation (0-100% top position, loops)
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%"; // Hidden before start
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  // Shimmer opacity - 0 before start, then 1
  const getShimmerOpacity = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return 0;
    return 1;
  };

  // Slider path animation - draws a rectangle around the cards using SVG stroke-dashoffset
  // Total perimeter for stroke-dasharray (approximate for rounded rect)
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
          {/* Top accent bar — red for BEFORE */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: `linear-gradient(90deg, ${BEFORE_ACCENT_BAR}, #f87171)`,
              borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
            }}
          />
          {/* Vertical accent strip on the left edge */}
          <div
            style={{
              position: "absolute",
              top: 12,
              bottom: 12,
              left: 0,
              width: 4,
              borderRadius: "0 4px 4px 0",
              background: BEFORE_ACCENT_BAR,
              opacity: 0.85,
            }}
          />

          {/* BEFORE tag - elevated card */}
          <div
            style={{
              position: "absolute",
              top: tagPaddingY + 8,
              left: tagPaddingX + 8,
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

          {/*
            Headline — wrapped lines from wrapLabel(). Uses the exact
            fontSize that fitText() / measureText() resolved, so the
            text never overflows the card.
          */}
          <div
            style={{
              fontSize: beforeHeadlineFontSize,
              fontWeight: 800,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.18,
              letterSpacing: -1.5,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              maxWidth: "100%",
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {beforeHeadline.lines.map((line, i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  maxWidth: "100%",
                }}
              >
                {line}
              </span>
            ))}
          </div>

          {/* Decorative elements for "before" state - elevated cards */}
          <div
            style={{
              marginTop: 24,
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
                  fontSize: tagFontSize + 2,
                  fontWeight: 600,
                  color: BEFORE_TAG_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: BEFORE_TAG_BG,
                  border: `1px solid ${BEFORE_TAG_BORDER}`,
                  padding: `${tagPaddingY}px ${tagPaddingX + 4}px`,
                  borderRadius: 999,
                  boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Shimmer animation - light orange sliding from top to bottom */}
          <div
            style={{
              position: "absolute",
              top: getShimmerTop(beforeShimmerStart),
              left: 0,
              width: "100%",
              height: "15%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
              opacity: getShimmerOpacity(beforeShimmerStart),
              borderRadius: cardBorderRadius,
              pointerEvents: "none",
            }}
          />
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
              top: isIdle ? `${(idleTimeSeconds * shimmerSpeed) % 100}%` : "-100%",
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
          {/* Top accent bar — green for AFTER */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: `linear-gradient(90deg, ${AFTER_ACCENT_BAR}, #4ade80)`,
              borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
            }}
          />
          {/* Vertical accent strip on the right edge */}
          <div
            style={{
              position: "absolute",
              top: 12,
              bottom: 12,
              right: 0,
              width: 4,
              borderRadius: "4px 0 0 4px",
              background: AFTER_ACCENT_BAR,
              opacity: 0.85,
            }}
          />

          {/* AFTER tag - elevated card */}
          <div
            style={{
              position: "absolute",
              top: tagPaddingY + 8,
              right: tagPaddingX + 8,
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
              boxShadow: "0 2px 8px rgba(22, 163, 74, 0.15)",
            }}
            role="label"
          >
            AFTER
          </div>

          {/*
            Headline — wrapped lines from wrapLabel(). Uses the exact
            fontSize that fitText() / measureText() resolved.
          */}
          <div
            style={{
              fontSize: afterHeadlineFontSize,
              fontWeight: 800,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.18,
              letterSpacing: -1.5,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              maxWidth: "100%",
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {afterHeadline.lines.map((line, i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  maxWidth: "100%",
                }}
              >
                {line}
              </span>
            ))}
          </div>

          {/* Decorative elements for "after" state - elevated cards */}
          <div
            style={{
              marginTop: 24,
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
                  fontSize: tagFontSize + 2,
                  fontWeight: 600,
                  color: AFTER_TAG_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: AFTER_TAG_BG,
                  border: `1px solid ${AFTER_TAG_BORDER}`,
                  padding: `${tagPaddingY}px ${tagPaddingX + 4}px`,
                  borderRadius: 999,
                  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.1)",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Shimmer animation - light orange sliding from top to bottom */}
          <div
            style={{
              position: "absolute",
              top: getShimmerTop(afterShimmerStart),
              left: 0,
              width: "100%",
              height: "15%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}44, transparent)`,
              opacity: getShimmerOpacity(afterShimmerStart),
              borderRadius: cardBorderRadius,
              pointerEvents: "none",
            }}
          />
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
