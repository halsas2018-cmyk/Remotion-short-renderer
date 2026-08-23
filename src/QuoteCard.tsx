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
  durationInFrames: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  attribution,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Quote text typewriter/fade animation
  const quoteStart = 0;
  const quoteDuration = 30;
  const quoteProgress = interpolate(frame, [quoteStart, quoteStart + quoteDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Attribution appears after quote
  const attrStart = quoteStart + quoteDuration - 10;
  const attrDuration = 20;
  const attrProgress = interpolate(frame, [attrStart, attrStart + attrDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Quotation marks animation
  const markStart = 0;
  const markDuration = 20;
  const markProgress = interpolate(frame, [markStart, markStart + markDuration], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1), // bounce
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle animation: subtle scale pulse on quotation marks
  const idlePulse = 1 + 0.02 * Math.sin(frame * 0.05);

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

  const padding = 120;
  const maxWidth = width - 2 * padding;

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
          width: maxWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Elevated card for the quote */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: "48px 64px",
            boxShadow: CARD_SHADOW,
            position: "relative",
          }}
        >
          {/* Opening quotation mark */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: ACCENT_COLOR,
              fontFamily: "Georgia, serif",
              lineHeight: 1,
              marginBottom: -40,
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
              fontSize: 48,
              fontWeight: 600,
              color: DARK_TEXT,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.4,
              letterSpacing: -1,
              marginBottom: 32,
              minHeight: 140,
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
              fontSize: 120,
              fontWeight: 800,
              color: ACCENT_COLOR,
              fontFamily: "Georgia, serif",
              lineHeight: 1,
              marginTop: -40,
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
              fontSize: 24,
              fontWeight: 500,
              color: MEDIUM_TEXT,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginTop: 24,
              opacity: attrProgress,
              transform: [{ translateY: interpolate(attrProgress, [0, 1], [20, 0]) }],
            }}
          >
            &mdash; {attribution}
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
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      quote: "The best way to predict the future is to invent it",
      attribution: "Alan Kay",
      durationInFrames: 90,
    }}
  />
);
