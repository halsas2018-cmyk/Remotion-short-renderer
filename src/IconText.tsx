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

export const IconText: React.FC<IconTextProps> = ({
  icon,
  text,
  durationInFrames,
  exitDirection = "up",
}) => {
  const frame = useCurrentFrame();
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

  // Text animation: starts slightly after icon
  const textDelayFrames = 12;
  const textProgress = interpolate(frame, [textDelayFrames, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textOpacity = isExit ? exitOpacity : textProgress;
  const textY = interpolate(textProgress, [0, 1], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text idle: subtle vertical drift
  const textIdleDrift = isIdle ? 3 * Math.sin(frame * 0.05) : 0;

  // Combined transform values for container
  const containerScale = isEntrance ? entranceScale : isExit ? exitScale : idleScale;
  const containerOpacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const containerTranslateX = isExit ? exitTranslateX : 0;
  const containerTranslateY = isExit ? exitTranslateY : 0;

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
            { scale: containerScale },
            { translateX: containerTranslateX },
            { translateY: containerTranslateY },
          ],
          opacity: containerOpacity,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${iconScale}) rotate(${iconIdleRotation}deg)`,
            opacity: iconOpacity,
            transformOrigin: "center",
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconComponent
            size={120}
            color="white"
            strokeWidth={1.5}
            style={{ filter: "drop-shadow(0 4px 24px rgba(255,255,255,0.15))" }}
          />
        </div>
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY + textIdleDrift}px)`,
            maxWidth: width - 240,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              color: "white",
              lineHeight: 1.3,
              letterSpacing: -1,
              textAlign: "center",
            }}
          >
            {text}
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
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      icon: "risk",
      text: "Broadcom only guarantees part of the loan",
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
