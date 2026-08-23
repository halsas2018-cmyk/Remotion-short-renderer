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
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";

export const PlainText: React.FC<PlainTextProps> = ({
  text,
  durationInFrames,
  exitDirection = "up",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const entranceFrames = 15;
  const exitStart = durationInFrames - 15;

  const isEntrance = frame < entranceFrames;
  const isExit = frame > exitStart;
  const isIdle = !isEntrance && !isExit;

  // Entrance animation for container
  const entranceProgress = interpolate(frame, [0, entranceFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = entranceProgress;

  // Exit animation for container
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitTranslateY = interpolate(
    frame,
    [exitStart, durationInFrames],
    [0, exitDirection === "up" ? -60 : exitDirection === "down" ? 60 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitTranslateX = interpolate(
    frame,
    [exitStart, durationInFrames],
    [0, exitDirection === "left" ? -60 : exitDirection === "right" ? 60 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Idle animation: subtle scale pulse on container
  const idleScale = 1 + 0.01 * Math.sin(frame * 0.06);

  // Split text into words
  const words = text.split(" ");
  const totalWords = words.length;
  
  // Word-by-word animation timing
  const wordDurationFrames = 8;
  const wordStaggerFrames = 4;
  const textStartDelay = 8;

  // Combined transform values for container
  const containerScale = isEntrance ? entranceScale : isExit ? exitScale : idleScale;
  const containerOpacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const containerTranslateX = isExit ? exitTranslateX : 0;
  const containerTranslateY = isExit ? exitTranslateY : 0;

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        // Transparent background so PersistentBackground grid shows through
        backgroundColor: "transparent",
      }}
    >
      <div
        style={{
          transform: [
            { scale: containerScale },
            { translateX: containerTranslateX },
            { translateY: containerTranslateY },
          ],
          opacity: containerOpacity,
          transformOrigin: "center",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {/* 
          Text container: centered vertically in the screen.
          Uses top: 50% + translateY(-50%) for true vertical centering.
        */}
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
                
                const wordOpacity = isExit ? exitOpacity : wordProgress;
                const wordY = interpolate(wordProgress, [0, 1], [30, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const wordScale = interpolate(wordProgress, [0, 1], [0.8, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                
                // Idle animation for words: subtle vertical drift
                const wordIdleDrift = isIdle ? 2 * Math.sin(frame * 0.05 + i * 0.5) : 0;

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
      exitDirection: "up",
    }}
  />
);
