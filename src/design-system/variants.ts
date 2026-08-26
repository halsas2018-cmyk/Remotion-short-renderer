import { tokens } from "./tokens";

/**
 * Card Variant Definitions
 * Each variant is a complete visual specification.
 * Feature components reference variants by name.
 */

export type CardVariantName =
  | "elevated"      // Default: white card, shadow, subtle border
  | "outlined"      // Border only, no shadow
  | "glass"         // Frosted glass, backdrop blur
  | "filled"        // Colored background, no border
  | "minimal"       // No border, no shadow, just content
  | "accent"        // Accent top bar, elevated
  | "accentGlass";  // Accent top bar, glass

export interface CardVariant {
  // Shell
  background: string;
  border: string;
  borderWidth: number;
  borderRadius: number;
  boxShadow: string;
  backdropFilter?: string;
  // Inner padding
  padding: number;
  // Optional accent bar (top)
  accentBar?: {
    height: number;
    background: string;
    borderRadius?: string; // e.g. "24px 24px 0 0"
  };
  // Entrance animation preset
  entrance: "fly-in" | "fade-up" | "scale" | "slide-up" | "none";
  // Idle animation preset
  idle: "float" | "pulse" | "tilt" | "breathe" | "none";
  // Content defaults
  contentAlign?: "center" | "start" | "end";
  gap?: number;
}

export const cardVariants: Record<CardVariantName, CardVariant> = {
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

  accent: {
    background: tokens.colors.white,
    border: tokens.colors.cardBorder,
    borderWidth: 1,
    borderRadius: tokens.radii.xl,
    boxShadow: tokens.shadows.card,
    padding: tokens.space.xl,
    accentBar: {
      height: 4,
      background: `linear-gradient(90deg, ${tokens.colors.accent}, ${tokens.colors.accentLight})`,
      borderRadius: `${tokens.radii.xl}px ${tokens.radii.xl}px 0 0`,
    },
    entrance: "fly-in",
    idle: "float",
    contentAlign: "center",
    gap: tokens.space.md,
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
      height: 4,
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
