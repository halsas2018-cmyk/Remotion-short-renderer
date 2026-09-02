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
import { useIdleMotion } from "./lib/idleMotion";
import { DottedUnderline, RotatedStamp } from "./lib/textCards";

interface QuoteCardProps {
  quote: string;
  attribution: string;
  durationInFrames?: number; // Optional override; defaults to composition duration
  emphasisWords?: string[];
  // Timing percentages for internal animation only
  quoteDurPct?: number;
  attrDelayPct?: number;
  attrDurPct?: number;
  markDurPct?: number;
  sliderDurPct?: number;
  // Per-word emphasis cycle timing (Horizon 2.4)
  wordDurPct?: number;
  wordStaggerPct?: number;
  wordStartDelayPct?: number;
}

// Google Font — type-safe, blocks rendering until the font is ready.
// Space Grotesk: geometric display face, punchy for kinetic typography.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "rgba(26, 26, 26, 0.62)";
const LIGHT_TEXT = "rgba(26, 26, 26, 0.38)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

// Rough-notation variety — cycle annotation style per emphasized word
// (mirrors the pattern in src/KeyStatement.tsx)
const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  attribution,
  durationInFrames: propsDurationInFrames,
  emphasisWords = [],
  quoteDurPct = 0.50,
  attrDelayPct = 0.03,
  attrDurPct = 0.10,
  markDurPct = 0.10,
  sliderDurPct = 0.45,
  // Per-word emphasis cycle (Horizon 2.4) — runs across the quote's
  // reveal window. wordStartDelayPct aligns with the typewriter's
  // first-word start (the first word starts at frame 0 of the
  // quote's reveal), so defaults here are not relative to the beat
  // start the way they are in KeyStatement.
  wordDurPct = 0.04,
  wordStaggerPct = 0.02,
  wordStartDelayPct = 0.0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — completes by ~70%, then holds
  // No exit animation — designed to be wrapped by SceneTransition
  // ============================================
  const quoteDuration = Math.round(durationInFrames * quoteDurPct);
  const attrStart = quoteDuration + Math.round(durationInFrames * attrDelayPct);
  const attrDuration = Math.round(durationInFrames * attrDurPct);
  const markDuration = Math.round(durationInFrames * markDurPct);
  const quoteEnd = quoteDuration;
  const attrEnd = attrStart + attrDuration;
  const marksEnd = Math.max(quoteEnd, attrEnd, markDuration);
  const sliderStart = marksEnd;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress animations
  const quoteProgress = interpolate(frame, [0, quoteDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const attrProgress = interpolate(frame, [attrStart, attrStart + attrDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const markProgress = interpolate(frame, [0, markDuration], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1), // bounce
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle pulse — time-based
  const allAnimationsDone = marksEnd;
  const isIdle = frame > allAnimationsDone;
  const idleTimeSeconds = (frame - allAnimationsDone) / fps;
  const idle = useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false });
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Shimmer timing
  const shimmerSpeed = 25;
  const quoteShimmerStart = quoteDuration;
  const attrShimmerStart = attrStart + attrDuration;

  // Typewriter effect for quote text
  const words = quote.split(" ");
  const visibleWordCount = Math.floor(words.length * quoteProgress);
  const currentWordIndex = Math.min(visibleWordCount, words.length - 1);
  const currentWordProgress = words.length * quoteProgress - visibleWordCount;

  // ============================================
  // Per-word emphasis cycle (Horizon 2.4)
  //
  // The typewriter reveal is the dominant animation. The emphasis
  // cycle must be subordinated to it: only fully-revealed words can
  // carry an annotation (you can't stroke a half-typed word). The
  // partial last word renders as plain text, no annotation.
  // ============================================
  const wordDuration = Math.round(durationInFrames * wordDurPct);
  const wordStagger = Math.round(durationInFrames * wordStaggerPct);
  const wordStartDelay = Math.round(durationInFrames * wordStartDelayPct);

  const emphasisSet = new Set(
    emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")),
  );

  let runIndex = 0;
  const advanceAnnotation = () => {
    const entry = ANNOTATION_CYCLE[runIndex % ANNOTATION_CYCLE.length];
    runIndex += 1;
    return entry;
  };

  // For each word, derive its typewriter window: it becomes visible at
  // (currentWordIndex's progress reaches its own "1.0" mark). We use a
  // linear mapping: word i becomes "fully visible" when quoteProgress
  // >= (i + 1) / words.length. Convert that to a frame using
  // quoteProgress's interpolation window.
  const getWordStartFrame = (wordIndex: number): number => {
    if (words.length === 0) return wordStartDelay;
    // Linear mapping: word i's reveal completes at quoteProgress == (i+1)/N.
    return Math.round(
      wordStartDelay + ((wordIndex + 1) / words.length) * quoteDuration - wordDuration,
    );
  };

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardWidth = Math.min(availableWidth, 800);
  const cardPadding = Math.max(48, width * 0.044);
  const cardBorderRadius = Math.max(40, width * 0.037);

  // Calculate card height based on content
  const quoteFontSize = Math.max(48, width * 0.044);
  const attrFontSize = Math.max(24, width * 0.022);
  const lineHeight = 1.35;
  const wordsPerLine = Math.max(1, Math.floor(cardWidth / (quoteFontSize * 0.6)));
  const estimatedLines = Math.ceil(words.length / wordsPerLine);
  const quoteTextHeight = estimatedLines * quoteFontSize * lineHeight;
  const minQuoteHeight = 160;
  const cardContentHeight = Math.max(minQuoteHeight, quoteTextHeight) + 32 + attrFontSize + 24 + 60;
  const cardHeight = cardContentHeight + cardPadding * 2;

  // Card outer dimensions (including padding)
  const cardOuterWidth = cardWidth + 2 * cardPadding;
  const cardOuterHeight = cardHeight + 2 * cardPadding;

  // Slider padding around the card
  const sliderPadding = 24;
  const sliderWidth = cardOuterWidth + 2 * sliderPadding;
  const sliderHeight = cardOuterHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + cardPadding + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes
  const markFontSize = Math.max(100, width * 0.092);

  // Shimmer position calculation
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  const getShimmerOpacity = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return 0;
    return quoteProgress;
  };

  // Slider path animation
  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  // Decorative line animation
  const lineProgress = interpolate(frame, [0, quoteDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Render the quote text per-word so the emphasis cycle can target
  // individual words. When no emphasis matches, the rendering is
  // visually equivalent to the pre-2.4 `displayWords.join(" ")` block.
  const renderQuoteWords = (): React.ReactNode => {
    if (emphasisSet.size === 0 || words.length === 0) {
      // Pre-2.4 path: render displayWords as a single string.
      // (displayWords is already built above.)
      return null; // signal to the caller to use the pre-2.4 path
    }
    return words.map((w, i) => {
      const isFullyRevealed = i < visibleWordCount;
      const isPartial = i === currentWordIndex && currentWordProgress > 0;
      // If neither fully revealed nor partial, render nothing (yet).
      if (!isFullyRevealed && !isPartial) return null;

      const cleanWord = w.toLowerCase().replace(/[.,!?;:]$/, "");
      const isEmphasized = emphasisSet.has(cleanWord);
      const wordStartFrame = getWordStartFrame(i);
      const wordEndFrame = wordStartFrame + wordDuration;
      const annotation = isEmphasized && isFullyRevealed ? advanceAnnotation() : null;

      // Display string: full word if fully revealed, otherwise the
      // partial slice of the in-progress word.
      const displayText = isFullyRevealed
        ? w
        : w.slice(0, Math.ceil(w.length * currentWordProgress));

      // Don't wrap partial words in the annotation — you can't stroke
      // a half-typed word. Force the partial word to render as plain
      // text with a softer emphasis style.
      const canAnnotate = isEmphasized && isFullyRevealed && annotation != null;

      const wordStyle: React.CSSProperties = {
        display: "inline-block",
        margin: "0 0.04em",
        opacity: interpolate(frame, [wordStartFrame, wordEndFrame], [0, 1], {
          easing: easeOutExpo,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: `0px ${
          interpolate(frame, [wordStartFrame, wordEndFrame], [20, 0], {
            easing: easeOutExpo,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }px`,
        ...(isEmphasized
          ? {
              backgroundImage: `linear-gradient(120deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 800,
            }
          : { fontWeight: 700, color: DARK_TEXT }),
        willChange: "transform, opacity",
      };

      const wordContent = <span style={wordStyle}>{displayText}</span>;

      if (canAnnotate && annotation) {
        const AnnotationComponent = annotation.Component;
        return (
          <AnnotationComponent
            key={i}
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
              }
            )}
          >
            {wordContent}
          </AnnotationComponent>
        );
      }
      return <span key={i}>{wordContent}</span>;
    });
  };

  const hasEmphasis = emphasisSet.size > 0;
  // Pre-2.4 displayWords (rebuilt here for the no-emphasis path).
  const displayWords: string[] = words.slice(0, visibleWordCount);
  if (currentWordIndex < words.length && currentWordProgress > 0 && !hasEmphasis) {
    const partialWord = words[currentWordIndex].slice(0, Math.ceil(words[currentWordIndex].length * currentWordProgress));
    displayWords.push(partialWord);
  }

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
          translate: "0px -50%",
          width: availableWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Wrapper — in-flow, grows with the card's natural content height */}
        <div
          style={{
            position: "relative",
            width: cardWidth,
            perspective: 1200,
          }}
        >
          {/* Slider border — pure CSS: negative insets track the wrapper's REAL size */}
          <div
            style={{
              position: "absolute",
              top: -sliderPadding,
              left: -sliderPadding,
              right: -sliderPadding,
              bottom: -sliderPadding,
              pointerEvents: "none",
              border: `${sliderStrokeWidth}px solid ${SLIDER_COLOR}`,
              borderRadius: sliderBorderRadius,
              boxSizing: "border-box",
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

          {/* Elevated card for the quote — normal flow child, height follows content */}
          <div
            style={{
              position: "relative",
              minHeight: cardContentHeight,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              padding: cardPadding,
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)",
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              transform: [
                { translateY: idle.translateY },
                { rotateX: idle.rotateX },
              ],
            }}
          >
            {/* Accent top bar with matching curved corners */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
                borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
              }}
            />

            {/* "FEATURED" rotated stamp — signature decoration in the
                top-right corner. Fades in after the quote finishes. */}
            <RotatedStamp
              label="Featured"
              color={ACCENT_COLOR}
              rotation={-8}
              fontSize={14}
              opacity={quoteProgress * 0.55}
            />

            {/* Content */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* Opening quotation mark */}
              <div
                style={{
                  fontSize: markFontSize,
                  fontWeight: 800,
                  color: ACCENT_COLOR,
                  fontFamily: "Georgia, serif",
                  lineHeight: 1,
                  marginBottom: -30,
                  transformOrigin: "center bottom",
                  transform: [{ scale: markProgress * idlePulse }],
                  opacity: markProgress,
                  textShadow: `0 4px 20px ${ACCENT_COLOR}40`,
                }}
              >
                &ldquo;
              </div>

              {/* Quote text with animated underline */}
              <div
                style={{
                  fontSize: quoteFontSize,
                  fontWeight: 700,
                  color: DARK_TEXT,
                  fontFamily,
                  lineHeight: 1.35,
                  letterSpacing: -1,
                  marginBottom: 32,
                  minHeight: Math.max(minQuoteHeight, quoteTextHeight),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  flex: 1,
                  position: "relative",
                  width: "100%",
                }}
              >
                {/* Animated underline that grows with text */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -16,
                    left: "50%",
                    transform: `translateX(-50%) scaleX(${lineProgress})`,
                    transformOrigin: "left center",
                    width: Math.min(cardWidth * 0.6, 400),
                    height: 3,
                    background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
                    borderRadius: 2,
                    opacity: quoteProgress,
                  }}
                />

                <span
                  style={{
                    opacity: quoteProgress,
                    transform: [{ translateY: interpolate(quoteProgress, [0, 1], [20, 0]) }],
                    // Flex-wrap so per-word spans flow onto multiple lines
                    // when the quote is long enough to wrap.
                    display: "inline-flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    rowGap: "0.1em",
                    columnGap: "0.1em",
                  }}
                >
                  {hasEmphasis ? renderQuoteWords() : displayWords.join(" ")}
                </span>
              </div>

              {/* Closing quotation mark */}
              <div
                style={{
                  fontSize: markFontSize,
                  fontWeight: 800,
                  color: ACCENT_COLOR,
                  fontFamily: "Georgia, serif",
                  lineHeight: 1,
                  marginTop: -30,
                  transformOrigin: "center top",
                  transform: [{ scale: markProgress * idlePulse }],
                  opacity: markProgress,
                  textShadow: `0 4px 20px ${ACCENT_COLOR}40`,
                }}
              >
                &rdquo;
              </div>

              {/* Attribution with decorative separator */}
              <div
                style={{
                  fontSize: attrFontSize,
                  fontWeight: 600,
                  color: MEDIUM_TEXT,
                  fontFamily,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginTop: 24,
                  opacity: attrProgress,
                  transform: [{ translateY: interpolate(attrProgress, [0, 1], [20, 0]) }],
                  position: "relative",
                  paddingTop: 24,
                  width: "100%",
                  textAlign: "center",
                }}
              >
                {/* Dotted accent rule above the attribution — signature
                    decoration. Replaces the old solid line. Draws in
                    with the attribution. */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    opacity: attrProgress,
                  }}
                >
                  <DottedUnderline
                    width={120}
                    color={ACCENT_COLOR}
                    progress={attrProgress}
                    strokeWidth={2}
                    opacity={0.9}
                  />
                </div>
                &mdash; {attribution}
              </div>
            </div>

            {/* Shimmer animation on card - properly positioned within card, only visible after start */}
            <div
              style={{
                position: "absolute",
                top: getShimmerTop(quoteShimmerStart),
                left: 0,
                width: "100%",
                height: "18%",
                background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                opacity: getShimmerOpacity(quoteShimmerStart),
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

export const QuoteCardTestComposition: React.FC = () => (
  <Composition
    id="QuoteCardTest"
    component={QuoteCard}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      quote: "The best way to predict the future is to invent it",
      attribution: "Alan Kay",
      emphasisWords: ["predict", "invent"],
    }}
  />
);

// Test with longer quote to verify dynamic sizing
export const QuoteCardLongTest: React.FC = () => (
  <Composition
    id="QuoteCardLongTest"
    component={QuoteCard}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      quote: "People who are really serious about software should make their own hardware because the hardware defines what the software can do",
      attribution: "Alan Kay",
      emphasisWords: ["serious", "software", "hardware"],
    }}
  />
);
