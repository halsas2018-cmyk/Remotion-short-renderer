import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface QuoteCardProps {
  quote: string;
  attribution: string;
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  quoteDurPct?: number;
  attrDelayPct?: number;
  attrDurPct?: number;
  markDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  attribution,
  durationInFrames: propsDurationInFrames,
  quoteDurPct = 0.50, // Slower: 50% of duration for full quote reveal
  attrDelayPct = 0.03,
  attrDurPct = 0.10,
  markDurPct = 0.10,
  sliderDurPct = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
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

  const displayWords = words.slice(0, visibleWordCount);
  if (currentWordIndex < words.length && currentWordProgress > 0) {
    const partialWord = words[currentWordIndex].slice(0, Math.ceil(words[currentWordIndex].length * currentWordProgress));
    displayWords.push(partialWord);
  }

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardWidth = Math.min(availableWidth, 800);
  const cardPadding = Math.max(48, width * 0.044);

  // Calculate card height based on content
  // Base height + quote text area + attribution + padding
  const quoteFontSize = Math.max(48, width * 0.044);
  const attrFontSize = Math.max(24, width * 0.022);
  const lineHeight = 1.35;
  const wordsPerLine = Math.max(1, Math.floor(cardWidth / (quoteFontSize * 0.6)));
  const estimatedLines = Math.ceil(words.length / wordsPerLine);
  const quoteTextHeight = estimatedLines * quoteFontSize * lineHeight;
  const minQuoteHeight = 160;
  const cardContentHeight = Math.max(minQuoteHeight, quoteTextHeight) + 32 + attrFontSize + 24 + 60; // quote + gap + attr + top/bottom padding
  const cardHeight = cardContentHeight + cardPadding * 2;

  // Container dimensions (for slider) - now dynamic based on actual card height
  const containerWidth = cardWidth + 2 * cardPadding;
  const containerHeight = cardHeight;
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = Math.max(28, width * 0.026);
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const markFontSize = Math.max(100, width * 0.092);

  // Shimmer position calculation - now relative to card (0-100% of card height)
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%"; // Hidden before start
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  // Slider path animation
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
      {/* Slider animation - black border circling the card (dynamic size) */}
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Elevated card for the quote - dynamic height */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: cardPadding,
            boxShadow: CARD_SHADOW,
            position: "relative",
            border: `1px solid ${CARD_BORDER}`,
            width: cardWidth,
            maxWidth: "100%",
            minHeight: cardHeight,
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
              borderRadius: "24px 24px 0 0",
            }}
          />

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
              transform: [
                { scale: markProgress * idlePulse },
              ],
              opacity: markProgress,
            }}
          >
            &ldquo;
          </div>

          {/* Quote text */}
          <div
            style={{
              fontSize: quoteFontSize,
              fontWeight: 700,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.35,
              letterSpacing: -1,
              marginBottom: 32,
              minHeight: Math.max(minQuoteHeight, quoteTextHeight),
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span
              style={{
                opacity: quoteProgress,
                transform: [{ translateY: interpolate(quoteProgress, [0, 1], [20, 0]) }],
              }}
            >
              {displayWords.join(" ")}
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
              transform: [
                { scale: markProgress * idlePulse },
              ],
              opacity: markProgress,
            }}
          >
            &rdquo;
          </div>

          {/* Attribution */}
          <div
            style={{
              fontSize: attrFontSize,
              fontWeight: 600,
              color: MEDIUM_TEXT,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginTop: 24,
              opacity: attrProgress,
              transform: [{ translateY: interpolate(attrProgress, [0, 1], [20, 0]) }],
            }}
          >
            &mdash; {attribution}
          </div>

          {/* Shimmer animation on card - now properly positioned within card */}
          <div
            style={{
              position: "absolute",
              top: getShimmerTop(quoteShimmerStart),
              left: 0,
              width: "100%",
              height: "18%",
              background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
              opacity: quoteProgress,
              borderRadius: 24,
              pointerEvents: "none",
            }}
          />
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
    }}
  />
);
