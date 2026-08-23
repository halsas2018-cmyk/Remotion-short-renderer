import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import * as LucideIcons from "lucide-react";

interface IconTextProps {
  icon: string;
  text: string;
  durationInFrames: number;
  startFrame?: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

// ICON_MAP mapping keyword strings to lucide-react icon components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  warning: LucideIcons.AlertTriangle,
  money: LucideIcons.DollarSign,
  chip: LucideIcons.Cpu,
  risk: LucideIcons.ShieldAlert,
  contract: LucideIcons.FileText,
  handshake: LucideIcons.Handshake,
  brain: LucideIcons.Brain,
  rocket: LucideIcons.Rocket,
  growth: LucideIcons.TrendingUp,
  decline: LucideIcons.TrendingDown,
  clock: LucideIcons.Clock,
  globe: LucideIcons.Globe,
  lock: LucideIcons.Lock,
  shield: LucideIcons.Shield,
  lightbulb: LucideIcons.Lightbulb,
  "trending-up": LucideIcons.TrendingUp,
  "trending-down": LucideIcons.TrendingDown,
};

// Default fallback icon
const DefaultIcon = LucideIcons.Info;

// Ease-out bezier curve (fast start, slow finish) - same as Material Design
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Color constants
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
// Glow constants
const GLOW_COLOR = "rgba(232, 108, 0, 0.35)";
const GLOW_BLUR = 60;
const GLOW_SPREAD = 20;

export const IconText: React.FC<IconTextProps> = ({
  icon,
  text,
  durationInFrames,
  startFrame = 0,
  exitDirection = "up",
}) => {
  const globalFrame = useCurrentFrame();
  const frame = globalFrame - startFrame;
  const { width, height } = useVideoConfig();

  const entranceFrames = 15;
  const exitStart = durationInFrames - 15;

  // Phase detection
  const isEntrance = frame < entranceFrames;
  const isExit = frame > exitStart;
  const isIdle = !isEntrance && !isExit;

  // Resolve icon component from map, fallback to DefaultIcon
  const IconComponent = ICON_MAP[icon.toLowerCase()] || DefaultIcon;

  // Entrance animation for whole component
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

  // Exit animation for whole component
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

  // Idle animation: subtle scale pulse
  const idleScale = 1 + 0.01 * Math.sin(frame * 0.06);

  // Icon animation: scale/fade in first
  const iconDurationFrames = Math.min(durationInFrames, 45);
  const iconProgress = interpolate(frame, [0, iconDurationFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const iconScale = interpolate(iconProgress, [0, 1], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const iconOpacity = iconProgress;

  // Icon idle: subtle rotation drift
  const iconIdleRotation = isIdle ? 2 * Math.sin(frame * 0.04) : 0;

  // Glow pulse animation (idle)
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Text animation: word-by-word appearance - complete within first 50% of beat
  const words = text.split(" ");
  const totalWords = words.length;
  const wordAnimationWindow = durationInFrames * 0.5; // first 50% of beat
  const wordDurationFrames = Math.max(6, wordAnimationWindow / totalWords * 0.8);
  const wordStaggerFrames = wordAnimationWindow / totalWords;
  const textStartDelay = entranceFrames + 12; // delay after icon starts
  
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
          IconText container: centered vertically in the screen.
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
          {/* Icon with elevated card + glow */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Glow behind icon card */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${glowPulse})`,
                width: "140%",
                height: "140%",
                borderRadius: 32,
                background: `radial-gradient(ellipse at center, ${GLOW_COLOR} 0%, transparent 70%)`,
                opacity: iconOpacity * glowOpacity,
                filter: `blur(${GLOW_BLUR}px)`,
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
            {/* Icon card */}
            <div
              style={{
                transform: `scale(${iconScale}) rotate(${iconIdleRotation}deg)`,
                opacity: iconOpacity,
                transformOrigin: "center",
                marginBottom: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
                borderRadius: 24,
                padding: 24,
                boxShadow: CARD_SHADOW,
                position: "relative",
                zIndex: 1,
              }}
            >
              <IconComponent
                size={100}
                color={ACCENT_COLOR}
                strokeWidth={2}
              />
            </div>
          </div>
          
          {/* Text with word-by-word animation + glow */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Glow behind text card */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${glowPulse})`,
                width: "110%",
                height: "110%",
                borderRadius: 32,
                background: `radial-gradient(ellipse at center, ${GLOW_COLOR} 0%, transparent 70%)`,
                opacity: (isExit ? exitOpacity : 1) * glowOpacity * 0.7,
                filter: `blur(${GLOW_BLUR}px)`,
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
            {/* Text card */}
            <div
              style={{
                maxWidth: width - 240,
                backgroundColor: "white",
                borderRadius: 24,
                padding: "32px 48px",
                boxShadow: CARD_SHADOW,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 600,
                  fontFamily: "system-ui, sans-serif",
                  color: DARK_TEXT,
                  lineHeight: 1.4,
                  letterSpacing: -0.5,
                  textAlign: "center",
                }}
              >
                {words.map((word, wordIndex) => {
                  const wordStartFrame = textStartDelay + wordIndex * wordStaggerFrames;
                  const wordEndFrame = wordStartFrame + wordDurationFrames;
                  
                  const wordProgress = interpolate(frame, [wordStartFrame, wordEndFrame], [0, 1], {
                    easing: easeOut,
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  
                  const wordOpacity = isExit ? exitOpacity : wordProgress;
                  const wordY = interpolate(wordProgress, [0, 1], [20, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  
                  // Idle animation for words: subtle vertical drift
                  const wordIdleDrift = isIdle ? 2 * Math.sin(frame * 0.05 + wordIndex * 0.5) : 0;

                  return (
                    <span
                      key={wordIndex}
                      style={{
                        display: "inline-block",
                        opacity: wordOpacity,
                        transform: `translateY(${wordY + wordIdleDrift}px)`,
                        margin: "0 2px",
                      }}
                    >
                      {word}{wordIndex < totalWords - 1 ? " " : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Test composition for isolated preview/render
export const IconTextTestComposition: React.FC = () => (
  <Composition
    id="IconTextTest"
    component={IconText}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      icon: "risk",
      text: "Broadcom only guarantees part of the loan",
      durationInFrames: 120,
      startFrame: 0,
      exitDirection: "up",
    }}
  />
);
