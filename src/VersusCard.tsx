import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface VersusSide {
  label: string;
  value?: string;
}

interface VersusCardProps {
  left: VersusSide;
  right: VersusSide;
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const CARD_BG = "rgba(255,255,255,0.05)";
const CARD_BORDER = "rgba(255,255,255,0.15)";
const DIVIDER_COLOR = "#FFD700";
const TEXT_COLOR = "white";
const VALUE_COLOR = "#FFD700";

export const VersusCard: React.FC<VersusCardProps> = ({
  left,
  right,
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

  // Entrance animation for whole component
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

  // Side slide-in animation: left from left, right from right
  const sideStagger = 10;
  const sideDuration = 25;
  const sideStart = entranceFrames;

  const leftProgress = interpolate(frame, [sideStart, sideStart + sideDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rightProgress = interpolate(frame, [sideStart + sideStagger, sideStart + sideStagger + sideDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Divider appears after sides
  const dividerProgress = interpolate(frame, [sideStart + sideDuration, sideStart + sideDuration + 15], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle animation: subtle pulse on divider
  const idlePulse = 1 + 0.05 * Math.sin(frame * 0.06);

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  // Layout
  const padding = 120;
  const cardWidth = (width - 2 * padding - 60) / 2; // 60px for divider space
  const cardHeight = 500;
  const centerY = height / 2;

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
        padding,
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
        }}
      >
        {/* Left Card */}
        <div
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: 24,
            backgroundColor: CARD_BG,
            border: `2px solid ${CARD_BORDER}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: 40,
            boxSizing: "border-box",
            transformOrigin: "center right",
            transform: [
              { translateX: interpolate(leftProgress, [0, 1], [-100, 0]) },
              { scale: leftProgress },
            ],
            opacity: leftProgress,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: TEXT_COLOR,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 16,
            }}
          >
            {left.label}
          </div>
          {left.value && (
            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: VALUE_COLOR,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.2,
              }}
            >
              {left.value}
            </div>
          )}
        </div>

        {/* Center Divider */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
            border: `2px solid ${DIVIDER_COLOR}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transformOrigin: "center",
            transform: [
              { scale: dividerProgress * (isIdle ? idlePulse : 1) },
            ],
            opacity: dividerProgress,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: DIVIDER_COLOR,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            VS
          </span>
        </div>

        {/* Right Card */}
        <div
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: 24,
            backgroundColor: CARD_BG,
            border: `2px solid ${CARD_BORDER}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: 40,
            boxSizing: "border-box",
            transformOrigin: "center left",
            transform: [
              { translateX: interpolate(rightProgress, [0, 1], [100, 0]) },
              { scale: rightProgress },
            ],
            opacity: rightProgress,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: TEXT_COLOR,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 16,
            }}
          >
            {right.label}
          </div>
          {right.value && (
            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: VALUE_COLOR,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.2,
              }}
            >
              {right.value}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const VersusCardTestComposition: React.FC = () => (
  <Composition
    id="VersusCardTest"
    component={VersusCard}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      left: { label: "Broadcom", value: "$70B debt" },
      right: { label: "Nvidia", value: "$500B exposure" },
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
