import { tokens } from "./tokens";

/**
 * Card Variant Definitions
 * Each variant is a complete visual specification.
 * The "accent" variant matches KeyStatement exactly.
 */

export type CardVariantName =
  | "elevated"      // Default: white card, shadow, subtle border
  | "outlined"      // Border only, no shadow
  | "glass"         // Frosted glass, backdrop blur
  | "filled"        // Colored background, no border
  | "minimal"       // No border, no shadow, just content
  | "accent"        // Accent top bar, elevated — matches KeyStatement exactly
  | "accentGlass";  // Accent top bar, glass

export interface CardVariant {
  // Shell
  background: string;
  border: string;
  borderWidth: number;
  borderRadius: number;        // base value, responsive calc in Card
  boxShadow: string;
  backdropFilter?: string;
  // Inner padding
  padding: number;             // base value, responsive calc in Card
  // Optional accent bar (top) — exact KeyStatement spec
  accentBar?: {
    height: number;
    background: string;
    borderRadius: string;      // e.g. "32px 32px 0 0"
  };
  // Background pattern — exact KeyStatement spec
  backgroundPattern?: {
    angle: number;
    color: string;
    opacity: number;
    size: number;
  };
  // Radial overlay for depth
  radialOverlay?: {
    background: string;
  };
  // Glow behind card — exact KeyStatement spec
  glow?: {
    background: string;
    blur: number;
    scale: number;
    opacityBase: number;
    opacityPulse: number;
    pulseScale: number;
  };
  // Accent dots at top
  topAccentDots?: {
    sizes: readonly number[];
    gap: number;
    color: string;
  };
  // Decorative separator line
  separator?: {
    width: number;
    height: number;
    color: string;
    opacityIdle: number;
    opacityAnimating: number;
  };
  // Accent dots below text
  bottomAccentDots?: {
    sizes: readonly number[];
    gap: number;
    color: string;
  };
  // Shimmer animation
  shimmer?: {
    height: string;
    color: string;
    speed: number; // % per second
  };
  // Slider border
  slider?: {
    padding: number;
    color: string;
    strokeWidthRatio: number;
    minStrokeWidth: number;
    glowBlur: number;
    glowColor: string;
  };
  // Entrance animation preset
  entrance: "fly-in" | "fade-up" | "scale" | "slide-up" | "none";
  // Idle animation preset
  idle: "float" | "pulse" | "tilt" | "breathe" | "keyStatement" | "none";
  // Content defaults
  contentAlign?: "center" | "start" | "end";
  gap?: number;
}

export const cardVariants: Record<CardVariantName, CardVariant> = {
  // KeyStatement-exact variant
  accent: {
    background: tokens.colors.white,
    border: tokens.colors.cardBorder,
    borderWidth: 1,
    borderRadius: tokens.card.minBorderRadius,
    boxShadow: tokens.shadows.card,
    padding: tokens.card.minPadding,
    accentBar: {
      height: tokens.card.accentBarHeight,
      background: `linear-gradient(90deg, ${tokens.colors.accent}, ${tokens.colors.accentLight})`,
      borderRadius: `${tokens.card.minBorderRadius}px ${tokens.card.minBorderRadius}px 0 0`,
    },
    backgroundPattern: {
      angle: 45,
      color: tokens.colors.accent,
      opacity: tokens.card.patternOpacity,
      size: tokens.card.patternSize,
    },
    radialOverlay: {
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.02) 100%)`,
    },
    glow: {
      background: tokens.shadows.glow,
      blur: tokens.card.glowBlur,
      scale: tokens.card.glowScale,
      opacityBase: tokens.card.glowOpacityBase,
      opacityPulse: tokens.card.glowOpacityPulse,
      pulseScale: tokens.card.glowPulseScale,
    },
    topAccentDots: {
      sizes: tokens.card.accentDotSizes,
      gap: tokens.card.accentDotGap,
      color: tokens.colors.accent,
    },
    separator: {
      width: tokens.card.separatorWidth,
      height: tokens.card.separatorHeight,
      color: tokens.colors.accent,
      opacityIdle: tokens.card.separatorOpacityIdle,
      opacityAnimating: tokens.card.separatorOpacityAnimating,
    },
    bottomAccentDots: {
      sizes: tokens.card.bottomDotSizes,
      gap: tokens.card.bottomDotGap,
      color: tokens.colors.accent,
    },
    shimmer: {
      height: tokens.card.shimmerHeight,
      color: tokens.colors.shimmerColor,
      speed: tokens.card.shimmerSpeed,
    },
    slider: {
      padding: tokens.card.sliderPadding,
      color: tokens.colors.sliderColor,
      strokeWidthRatio: tokens.card.sliderStrokeWidthRatio,
      minStrokeWidth: tokens.card.minSliderStrokeWidth,
      glowBlur: 20,
      glowColor: "rgba(26, 26, 26, 0.15)",
    },
    entrance: "fly-in",
    idle: "keyStatement",
    contentAlign: "center",
    gap: tokens.space.md,
  },

  // Other variants — simplified, can be expanded later
  elevated: {
    background: tokens.colors.white,
    border: tokens.colors.cardBorder,
    borderWidth: 1,
    borderRadius: tokens.radii.xl,
    boxShadow: tokens.shadows.card,
    padding: tokens.space.xl,
    entrance: "fly-in",
    idle: "float",
    contentAlign: "center",
    gap: tokens.space.md,
  },

  outlined: {
    background: "transparent",
    border: tokens.colors.cardBorder,
    borderWidth: 2,
    borderRadius: tokens.radii.xl,
    boxShadow: "none",
    padding: tokens.space.xl,
    entrance: "fade-up",
    idle: "none",
    contentAlign: "center",
    gap: tokens.space.md,
  },

  glass: {
    background: "rgba(255, 255, 255, 0.7)",
    border: tokens.colors.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radii.xl,
    boxShadow: tokens.shadows.glass,
    backdropFilter: "blur(20px) saturate(180%)",
    padding: tokens.space.xl,
    entrance: "fade-up",
    idle: "tilt",
    contentAlign: "center",
    gap: tokens.space.md,
  },

  filled: {
    background: tokens.colors.dark,
    border: "transparent",
    borderWidth: 0,
    borderRadius: tokens.radii.xl,
    boxShadow: tokens.shadows.cardStrong,
    padding: tokens.space.xl,
    entrance: "slide-up",
    idle: "breathe",
    contentAlign: "center",
    gap: tokens.space.md,
  },

  minimal: {
    background: "transparent",
    border: "transparent",
    borderWidth: 0,
    borderRadius: 0,
    boxShadow: "none",
    padding: 0,
    entrance: "fade-up",
    idle: "none",
    contentAlign: "start",
    gap: tokens.space.sm,
  },

  accentGlass: {
    background: "rgba(255, 255, 255, 0.7)",
    border: tokens.colors.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radii.xl,
    boxShadow: tokens.shadows.glass,
    backdropFilter: "blur(20px) saturate(180%)",
    padding: tokens.space.xl,
    accentBar: {
      height: tokens.card.accentBarHeight,
      background: `linear-gradient(90deg, ${tokens.colors.accent}, ${tokens.colors.accentLight})`,
      borderRadius: `${tokens.radii.xl}px ${tokens.radii.xl}px 0 0`,
    },
    entrance: "fade-up",
    idle: "tilt",
    contentAlign: "center",
    gap: tokens.space.md,
  },
} as const;

export function getVariant(name: CardVariantName): CardVariant {
  return cardVariants[name];
}

export function listVariants(): CardVariantName[] {
  return Object.keys(cardVariants) as CardVariantName[];
}
