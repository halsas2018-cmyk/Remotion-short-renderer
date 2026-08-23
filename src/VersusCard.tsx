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
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const DIVIDER_COLOR = ACCENT_COLOR;
const CARD_BG = "white";
const CARD_BORDER = "#e8e8e8";

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
  const availableWidth = width - 2 * padding;
  const dividerWidth = 80;
  const cardWidth = (availableWidth - dividerWidth) / 2;
  const cardHeight = 500;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
        position: "relative",
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
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {/* 
          Versus container: centered vertically in the screen.
          Uses top: 50% + translateY(-50%) for true vertical centering.
        */}
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
            gap: 0,
          }}
        >
          {/* Left Card - elevated */}
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
              boxShadow: CARD_SHADOW,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: DARK_TEXT,
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
                  color: ACCENT_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.2,
                }}
              >
                {left.value}
              </div>
            )}
          </div>

          {/* Center Divider - elevated */}
          <div
            style={{
              width: dividerWidth,
              height: dividerWidth,
              borderRadius: "50%",
              backgroundColor: CARD_BG,
              border: `3px solid ${DIVIDER_COLOR}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transformOrigin: "center",
              transform: [
                { scale: dividerProgress * (isIdle ? idlePulse : 1) },
              ],
              opacity: dividerProgress,
              flexShrink: 0,
              boxShadow: CARD_SHADOW,
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

          {/* Right Card - elevated */}
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
              boxShadow: CARD_SHADOW,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: DARK_TEXT,
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
                  color: ACCENT_COLOR,
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.2,
                }}
              >
                {right.value}
              </div>
            )}
          </div>
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
