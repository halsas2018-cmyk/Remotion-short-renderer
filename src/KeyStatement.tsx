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
const ACCENT_COLOR = "#FFD700"; // Gold accent for emphasis

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

  // Entrance animation
  const entranceProgress = interpolate(frame, [0, entranceFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = entranceProgress;

  // Exit animation
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.85], {
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

  // Idle animation: subtle scale pulse for emphasized words
  const idlePulse = 1 + 0.02 * Math.sin(frame * 0.08);

  // Split text into words and mark emphasis
  const words = text.split(" ");
  const emphasisSet = new Set(emphasisWords.map((w) => w.toLowerCase()));

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
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
            { scale },
            { translateX },
            { translateY },
          ],
          opacity,
          transformOrigin: "center",
          maxWidth: width - 240,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            color: "white",
            lineHeight: 1.25,
            letterSpacing: -2,
            textAlign: "center",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.1em",
          }}
        >
          {words.map((word, i) => {
            const isEmphasized = emphasisSet.has(word.toLowerCase().replace(/[.,!?;:]$/, ""));
            return (
              <span
                key={i}
                style={{
                  fontSize: isEmphasized ? 80 : 72,
                  fontWeight: isEmphasized ? 900 : 800,
                  color: isEmphasized ? ACCENT_COLOR : "white",
                  transform: isEmphasized && isIdle ? [{ scale: idlePulse }] : undefined,
                  transformOrigin: "center",
                  display: "inline-block",
                  transition: "transform 0.1s ease-out",
                }}
              >
                {word}{i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const KeyStatementTestComposition: React.FC = () => (
  <Composition
    id="KeyStatementTest"
    component={KeyStatement}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      emphasisWords: ["scarce"],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
