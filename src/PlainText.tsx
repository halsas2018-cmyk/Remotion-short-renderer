import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface PlainTextProps {
  text: string;
  durationInFrames: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";

export const PlainText: React.FC<PlainTextProps> = ({
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Split text into words
  const words = text.split(" ");
  const totalWords = words.length;
  
  // Word-by-word animation timing
  const wordDurationFrames = 8;
  const wordStaggerFrames = 4;
  const textStartDelay = 8;

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
          left: 120,
          right: 120,
          transform: "translateY(-50%)",
          width: width - 240,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: "48px 64px",
            boxShadow: CARD_SHADOW,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              color: DARK_TEXT,
              lineHeight: 1.3,
              letterSpacing: -1.5,
              textAlign: "center",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0.08em",
            }}
          >
            {words.map((word, i) => {
              // Word entrance animation
              const wordStartFrame = textStartDelay + i * wordStaggerFrames;
              const wordEndFrame = wordStartFrame + wordDurationFrames;
              
              const wordProgress = interpolate(frame, [wordStartFrame, wordEndFrame], [0, 1], {
                easing: easeOut,
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              
              const wordOpacity = wordProgress;
              const wordY = interpolate(wordProgress, [0, 1], [30, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const wordScale = interpolate(wordProgress, [0, 1], [0.8, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              
              // Idle animation for words: subtle vertical drift
              const wordIdleDrift = 2 * Math.sin(frame * 0.05 + i * 0.5);

              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: wordOpacity,
                    transform: `translateY(${wordY + wordIdleDrift}px) scale(${wordScale})`,
                    transformOrigin: "center bottom",
                    fontSize: 64,
                    fontWeight: 700,
                    color: DARK_TEXT,
                    fontFamily: "system-ui, sans-serif",
                    lineHeight: 1.3,
                    margin: "0 0.04em",
                  }}
                >
                  {word}{i < totalWords - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Test composition for isolated preview/render
export const PlainTextTestComposition: React.FC = () => (
  <Composition
    id="PlainTextTest"
    component={PlainText}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      durationInFrames: 120,
    }}
  />
);
