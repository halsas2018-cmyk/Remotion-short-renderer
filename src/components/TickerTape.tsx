import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { Highlight, Circle, Underline } from "@remotion/rough-notation";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { useIdleMotion } from "../lib/idleMotion";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface TickerTapeProps {
  stories: string[];
  label?: string;
  durationInFrames?: number;
  /**
   * Per-word emphasis cycle (Horizon 2.4 §3.4.1). Each word in any
   * `stories` entry that matches an entry here is rendered with the
   * next entry in the `Highlight` → `Underline` → `Circle` cycle.
   * Words are matched case-insensitively, with trailing punctuation
   * (`.,!?;:""''`) stripped. The cycle index advances across headlines,
   * so the first emphasized word gets `Highlight`, the second gets
   * `Underline`, the third `Circle`, the fourth `Highlight`, etc.
   *
   * Default `[]` — the pre-2.5 visual is preserved exactly when no
   * `emphasisWords` are passed (no per-word spans, no annotations).
   */
  emphasisWords?: string[];
  // Per-word emphasis cycle timing (Horizon 2.4) — runs across the
  // scroll window. Defaults follow the same shape as `BeforeAfter` /
  // `VersusCard` so the cycle's stagger / duration / start-delay
  // percentages are uniform across the 8 text-on-card components.
  wordDurPct?: number;
  wordStaggerPct?: number;
  wordStartDelayPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_COLOR_LIGHT = "#f97316";
const ACCENT_GLOW = "rgba(232, 108, 0, 0.4)";
const DARK_TEXT = "#1a1a1a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

// Rough-notation variety — cycle annotation style per emphasized word
// (mirrors src/KeyStatement.tsx). The order is Highlight → Underline
// → Circle, which matches the cycle used by the other 7 text-on-card
// components (per §3.4.1).
const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Underline, color: ACCENT_COLOR },
  { Component: Circle, color: ACCENT_COLOR_LIGHT },
];

/**
 * Strips trailing sentence-final punctuation from a word so the
 * `emphasisWords` match works regardless of whether the source data
 * ends the word with a `.` or `,`. Mirrors the helper in
 * `KeyStatement` / `VersusCard` / `BeforeAfter`.
 */
const stripTrailingPunct = (s: string): string =>
  s.toLowerCase().replace(/[.,!?;:"'’]$/, "");

/**
 * Walk all `stories` and return, in left-to-right visual order, the
 * (wordIndexWithinStory, wordString) pair for every word in every
 * story. The order is what the `RenderWord` loop will visit when
 * rendering. We pre-compute it (rather than walking the stories
 * twice) so the emphasis-cycle index can be assigned at the same
 * pass.
 */
const flattenStories = (
  stories: string[],
): Array<{ storyIndex: number; wordIndex: number; word: string }> => {
  const flat: Array<{ storyIndex: number; wordIndex: number; word: string }> = [];
  stories.forEach((story, si) => {
    story.split(/\s+/).filter(Boolean).forEach((w, wi) => {
      flat.push({ storyIndex: si, wordIndex: wi, word: w });
    });
  });
  return flat;
};

export const TickerTape: React.FC<TickerTapeProps> = ({
  stories,
  label = "BREAKING",
  durationInFrames: propsDurationInFrames,
  emphasisWords = [],
  wordDurPct = 0.10,
  wordStaggerPct = 0.04,
  wordStartDelayPct = 0.20,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // 30-40% entrance rule
  const tapeStart = Math.round(durationInFrames * 0.05);
  const tapeDuration = Math.round(durationInFrames * 0.10);
  const tapeEnd = tapeStart + tapeDuration;
  const entranceEndFrame = tapeEnd;
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const tapeProgress = interpolate(frame, [tapeStart, tapeEnd], [0, 1], {
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

  const cardEntranceDuration = Math.max(12, Math.round(durationInFrames * 0.07));
  const isIdle = frame > entranceEndFrame;
  // Card idle bounce + 3D tilt (shared useIdleMotion hook).
  // We pass `glow: false` because the card transform doesn't use scale,
  // and the radial-blur glow sibling has its own scale: glowPulse local.
  const idle = useIdleMotion({
    bounce: isIdle,
    tilt: isIdle,
    glow: false,
  });
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Ticker is full-width, narrow height
  const padding = Math.max(60, width * 0.08);
  const availableWidth = width - 2 * padding;
  const tapeHeight = Math.max(120, height * 0.10);
  const cardBorderRadius = Math.max(20, tapeHeight * 0.16);

  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const labelFontSize = Math.max(28, tapeHeight * 0.24);
  const storyFontSize = Math.max(24, tapeHeight * 0.20);

  // ============================================
  // Per-word emphasis cycle (Horizon 2.4 / §3.4.1)
  // ============================================
  // We pre-compute the emphasis assignments for ALL words across all
  // headlines before the JSX pass, so the cycle index crosses headline
  // boundaries (matches the "one running index across both sides"
  // pattern in `VersusCard` / `BeforeAfter`).
  const flatWords = flattenStories(stories);
  const totalFlatWords = flatWords.length;
  const emphasisSet = new Set(emphasisWords.map(stripTrailingPunct));

  const wordDuration = Math.round(durationInFrames * wordDurPct);
  const wordStagger = Math.round(durationInFrames * wordStaggerPct);
  const wordStartDelay = Math.round(durationInFrames * wordStartDelayPct);

  // For each flat word: is it emphasized? If so, which cycle entry?
  // null when not emphasized (the pre-2.5 visual path is byte-equivalent
  // when emphasisWords is empty, so this is the no-op default).
  let runIndex = 0;
  const wordAnnotations: (typeof ANNOTATION_CYCLE[number] | null)[] = flatWords.map(
    ({ word }) => {
      if (!emphasisSet.has(stripTrailingPunct(word))) return null;
      const entry = ANNOTATION_CYCLE[runIndex % ANNOTATION_CYCLE.length];
      runIndex += 1;
      return entry;
    },
  );

  // Build scrolling content. When `emphasisWords` is non-empty, we
  // need to render each word as its own <span> (or annotation-wrapped
  // span) so the per-word fade-in + annotation can target individual
  // words. When `emphasisWords` is empty, we fall back to the pre-2.5
  // single-string render — which is byte-equivalent to the baseline
  // `TickerTapeTest` PNG.
  const hasEmphasis = emphasisSet.size > 0;
  const storyText = stories.map((s) => s.toUpperCase()).join("   •   ");
  // The content text is duplicated for the seamless loop. When
  // `hasEmphasis`, we duplicate the per-word list instead so the
  // wrapping <span> structure is identical on both halves of the loop.
  const contentText = `${storyText}   •   ${storyText}   •   `;
  const flatWordsLooped = hasEmphasis
    ? [...flatWords, ...flatWords]
    : [];

  // Heuristic width: ~0.55× fontSize per character in Space Grotesk.
  // When `hasEmphasis`, the wrapped spans occupy roughly the same width
  // (per-word whitespace is preserved), so the same heuristic works
  // for both rendering paths.
  const estimatedContentWidth = contentText.length * storyFontSize * 0.55;

  // Linear scroll across the idle phase
  const scrollEnd = Math.max(sliderStart + 1, durationInFrames);
  const scrollProgress = interpolate(frame, [sliderStart, scrollEnd], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const contentTranslateX = -(estimatedContentWidth / 2) * scrollProgress;

  const shimmerStart = entranceEndFrame;
  const shimmerSpeed = 25;
  const getShimmerTop = (s: number) => {
    if (frame < s) return "-100%";
    const elapsedSeconds = (frame - s) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };
  const getShimmerOpacity = (s: number) => (frame < s ? 0 : 1);

  // Helper: render a single word with the optional emphasis fade-in
  // and annotation. Used only when `hasEmphasis` is true; the
  // `hasEmphasis === false` path renders `${contentText}` as one
  // string (pre-2.5 visual).
  const renderWord = (
    w: string,
    flatIndex: number,
    isLastInLoop: boolean,
  ): React.ReactNode => {
    const annotation = wordAnnotations[flatIndex % totalFlatWords];
    const isEmphasized = annotation != null;
    const wordStartFrame = wordStartDelay + flatIndex * wordStagger;
    const wordEndFrame = wordStartFrame + wordDuration;

    const wordOpacity = interpolate(
      frame,
      [wordStartFrame, wordEndFrame],
      [0, 1],
      {
        easing: easeOutExpo,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    const wordTranslateY = interpolate(
      frame,
      [wordStartFrame, wordEndFrame],
      [12, 0],
      {
        easing: easeOutExpo,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

    const wordStyle: React.CSSProperties = {
      display: "inline-block",
      fontSize: storyFontSize,
      fontWeight: isEmphasized ? 700 : 500,
      fontFamily,
      color: DARK_TEXT,
      letterSpacing: 0.5,
      paddingRight: 40, // matches the inter-headline "   •   " gap
      opacity: wordOpacity,
      translate: `0px ${wordTranslateY}px`,
      willChange: "transform, opacity",
      ...(isEmphasized
        ? {
            backgroundImage: `linear-gradient(120deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }
        : {}),
    };

    const wordContent = <span style={wordStyle}>{w}</span>;

    if (isEmphasized && annotation) {
      const AnnotationComponent = annotation.Component;
      return (
        <AnnotationComponent
          key={flatIndex}
          color={annotation.color}
          strokeWidth={3}
          padding={4}
          progress={interpolate(
            frame,
            [wordStartFrame, wordEndFrame + 5],
            [0, 1],
            {
              easing: easeOutExpo,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )}
        >
          {wordContent}
        </AnnotationComponent>
      );
    }
    // Wrap the un-emphasized word in a non-keyed span so React's
    // reconciliation across the per-word list is stable.
    return (
      <span key={flatIndex} style={{ display: "inline-block" }}>
        {wordContent}
      </span>
    );
  };

  return (
    <AbsoluteFill style={{ width, height, backgroundColor: "transparent" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          translate: "0px -50%",
          width: availableWidth,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: availableWidth,
            perspective: 1200,
          }}
        >
          {/* Slider */}
          <div
            style={{
              position: "absolute",
              inset: -sliderPadding,
              pointerEvents: "none",
              border: `${sliderStrokeWidth}px solid ${SLIDER_COLOR}`,
              borderRadius: sliderBorderRadius,
              boxSizing: "border-box",
              opacity: interpolate(frame, [sliderStart, sliderStart + 10], [0, 1], {
                easing: easeOut,
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(
                frame,
                [sliderStart, sliderStart + sliderDuration],
                [0.94, 1],
                {
                  easing: Easing.spring({ damping: 200 }),
                  output: "perceptual-scale",
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              ),
              filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
            }}
          />

          {/* Card */}
          <div
            style={{
              position: "relative",
              height: tapeHeight,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "stretch",
              opacity: interpolate(frame, [0, cardEntranceDuration], [0, 1], {
                easing: easeOut,
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [0, cardEntranceDuration], [0.92, 1], {
                easing: Easing.spring({ damping: 200 }),
                output: "perceptual-scale",
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: `0px ${idle.translateY}px`,
              rotate: `x ${idle.rotateX}deg`,
              overflow: "hidden",
            }}
          >
            {/* Top accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
                zIndex: 3,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: cardBorderRadius,
                opacity: 0.03,
                backgroundImage: `repeating-linear-gradient(45deg, ${ACCENT_COLOR} 0, ${ACCENT_COLOR} 1px, transparent 1px, transparent 20px)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: -1,
              }}
            >
              <div
                style={{
                  width: "110%",
                  height: "110%",
                  borderRadius: cardBorderRadius,
                  background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)`,
                  opacity: glowOpacity,
                  filter: `blur(60px)`,
                  scale: glowPulse,
                }}
              />
            </div>

            {/* Label box on the left */}
            <div
              style={{
                flexShrink: 0,
                width: Math.max(180, label.length * labelFontSize * 0.6 + 40),
                background: `linear-gradient(135deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                color: "white",
                fontWeight: 700,
                fontSize: labelFontSize,
                fontFamily,
                letterSpacing: 2,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
                opacity: tapeProgress,
                filter: isIdle
                  ? `drop-shadow(0 0 ${8 + 4 * Math.sin(frame * 0.15)}px ${ACCENT_GLOW})`
                  : "none",
                position: "relative",
                zIndex: 2,
              }}
            >
              {label}
            </div>

            {/* Scrolling content area */}
            <div
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                opacity: tapeProgress,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  transform: `translateX(${contentTranslateX}px)`,
                }}
              >
                {hasEmphasis ? (
                  // Render each word as its own span. The list is
                  // duplicated (flatWordsLooped) so the seamless-scroll
                  // second half of the loop is structurally identical
                  // to the first half.
                  flatWordsLooped.map((entry, i) =>
                    renderWord(entry.word, i, i === flatWordsLooped.length - 1),
                  )
                ) : (
                  // Pre-2.5 visual: a single string with the original
                  // `${contentText}` inter-headline gap. Byte-equivalent
                  // to the pre-fix `TickerTapeTest` PNG when
                  // `emphasisWords` is omitted.
                  <span
                    style={{
                      fontSize: storyFontSize,
                      fontWeight: 500,
                      fontFamily,
                      color: DARK_TEXT,
                      letterSpacing: 0.5,
                      paddingRight: 40,
                    }}
                  >
                    {contentText}
                  </span>
                )}
              </div>
              {/* Left fade */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 40,
                  height: "100%",
                  background: "linear-gradient(90deg, white 0%, transparent 100%)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
              {/* Right fade */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 40,
                  height: "100%",
                  background: "linear-gradient(270deg, white 0%, transparent 100%)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            </div>

            {/* Shimmer */}
            <div
              style={{
                position: "absolute",
                top: getShimmerTop(shimmerStart),
                left: 0,
                width: "100%",
                height: "18%",
                background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                opacity: getShimmerOpacity(shimmerStart),
                borderRadius: cardBorderRadius,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TickerTapeTestComposition: React.FC = () => (
  <Composition
    id="TickerTapeTest"
    component={TickerTape}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      stories: [
        "FED HOLDS RATES STEADY",
        "AI CHIP DEMAND SURGES",
        "TECH EARNINGS BEAT EXPECTATIONS",
        "EUROPEAN MARKETS RALLY",
        "OIL PRICES CLIMB",
      ],
      label: "BREAKING",
    }}
  />
);
