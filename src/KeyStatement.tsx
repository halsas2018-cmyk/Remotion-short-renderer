import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface KeyStatementProps {
  text: string;
  emphasisWords: string[];
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";

export const KeyStatement: React.FC<KeyStatementProps> = ({
  text,
  emphasisWords,
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

  // Split text into words and mark emphasis
  const words = text.split(" ");
  const emphasisSet = new Set(emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")));
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
        backgroundColor: "white",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 120,
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
          maxWidth: width - 240,
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
              const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, "");
              const isEmphasized = emphasisSet.has(cleanWord);
              
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
              
              // Idle animation for emphasized words: subtle scale pulse
              const idlePulse = isIdle && isEmphasized ? 1 + 0.03 * Math.sin(frame * 0.1 + i) : 1;
              
              // Base font size - emphasized words are larger
              const baseFontSize = isEmphasized ? 76 : 64;
              const baseFontWeight = isEmphasized ? 900 : 700;
              const wordColor = isEmphasized ? ACCENT_COLOR : DARK_TEXT;

              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: wordOpacity,
                    transform: `translateY(${wordY}px) scale(${wordScale * idlePulse})`,
                    transformOrigin: "center bottom",
                    fontSize: baseFontSize,
                    fontWeight: baseFontWeight,
                    color: wordColor,
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

export const KeyStatementTestComposition: React.FC = () => (
  <Composition
    id="KeyStatementTest"
    component={KeyStatement}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      emphasisWords: ["scarce"],
      durationInFrames: 120,
      exitDirection: "up",
    }}
  />
);
