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
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Resolve icon component from map, fallback to DefaultIcon
  const IconComponent = ICON_MAP[icon.toLowerCase()] || DefaultIcon;

  // Entrance animation for whole component
  const entranceFrames = 15;
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

  // Text animation: starts slightly after icon
  const textDelayFrames = 12;
  const textProgress = interpolate(frame, [textDelayFrames, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textOpacity = textProgress;
  const textY = interpolate(textProgress, [0, 1], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          transform: `scale(${entranceScale})`,
          opacity: entranceOpacity,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${iconScale})`,
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
            transform: `translateY(${textY}px)`,
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
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      icon: "risk",
      text: "Broadcom only guarantees part of the loan",
      durationInFrames: 90,
    }}
  />
);
