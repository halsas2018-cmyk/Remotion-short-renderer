/**
 * Design Tokens — Single source of truth for all visual values.
 * Matched exactly to KeyStatement card (the official design).
 */
export const tokens = {
  // Color palette
  colors: {
    // Accent (brand orange) — exact from KeyStatement
    accent: "#e86c00",
    accentLight: "#f97316",
    accentGlow: "rgba(232, 108, 0, 0.4)",
    accentSubtle: "rgba(232, 108, 0, 0.15)",
    accentShimmer: "rgba(232, 108, 0, 0.2)", // #e86c0033

    // Neutrals — exact from KeyStatement
    dark: "#1a1a1a",
    darkMuted: "rgba(26, 26, 26, 0.62)",
    darkFaint: "rgba(26, 26, 26, 0.38)",
    white: "#ffffff",
    offWhite: "#fafafa",
    gray50: "#f5f5f5",
    gray100: "#eeeeee",
    gray200: "#e8e8e8",
    gray300: "#e0e0e0",

    // Semantic — exact from KeyStatement
    cardBorder: "#e8e8e8",
    cardShadow: "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)",
    cardShadowStrong: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)",
    glassBorder: "rgba(255, 255, 255, 0.3)",
    glassShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
    sliderColor: "#1a1a1a",
    shimmerColor: "rgba(232, 108, 0, 0.2)",
  },

  // Border radius scale — responsive formula from KeyStatement
  radii: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,        // min card border radius
    xxl: 48,
    full: 9999,
  },

  // Spacing scale — responsive formula from KeyStatement
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,       // min card padding
    xxxl: 64,
  },

  // Typography scale
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    display: 64,
    displayLg: 80,
  },

  // Font weights
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeights: {
    tight: 1.1,
    normal: 1.3,
    relaxed: 1.5,
  },

  // Letter spacing
  letterSpacing: {
    tight: -1.5,
    normal: 0,
    wide: 0.5,
  },

  // Shadows — exact from KeyStatement
  shadows: {
    card: "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)",
    cardStrong: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)",
    glass: "0 8px 32px rgba(0, 0, 0, 0.08)",
    glow: "radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)",
    innerGlow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  },

  // Transitions / animation — exact from KeyStatement
  easing: {
    easeOut: [0.16, 1, 0.3, 1] as const,
    easeOutExpo: [0.19, 1, 0.22, 1] as const,
    spring: { damping: 200, stiffness: 300 },
  },

  // Z-index layers
  zIndex: {
    base: 0,
    content: 1,
    accent: 2,
    overlay: 10,
    modal: 100,
  },

  // Card-specific constants from KeyStatement
  card: {
    minBorderRadius: 32,
    borderRadiusRatio: 0.03,      // width * 0.03
    minPadding: 48,
    paddingRatio: 0.044,          // width * 0.044
    minContainerHeight: 400,
    accentBarHeight: 4,
    sliderPadding: 24,
    sliderStrokeWidthRatio: 0.0045, // width * 0.0045
    minSliderStrokeWidth: 5,
    shimmerHeight: "18%",
    shimmerSpeed: 25,             // % per second
    patternOpacity: 0.03,
    patternSize: 20,
    glowBlur: 60,
    glowScale: 1.1,
    glowOpacityBase: 0.5,
    glowOpacityPulse: 0.2,
    glowPulseScale: 0.15,
    accentDotSizes: [6, 8, 6] as const,
    accentDotGap: 8,
    bottomDotSizes: [5, 7, 5] as const,
    bottomDotGap: 10,
    separatorWidth: 80,
    separatorHeight: 3,
    separatorOpacityIdle: 0.7,
    separatorOpacityAnimating: 0.4,
  },
} as const;

export type Tokens = typeof tokens;
