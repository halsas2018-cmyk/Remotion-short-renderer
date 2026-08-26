import React from "react";
import { tokens } from "./tokens";

/**
 * CardContent — Standardized content slots for cards.
 * Feature components compose these instead of writing raw divs.
 * Ensures consistent typography, spacing, hierarchy.
 */

export interface CardContentHeaderProps {
  children: React.ReactNode;
  /** Override font size */
  fontSize?: number;
  /** Override font weight */
  fontWeight?: number;
  /** Override color */
  color?: string;
  /** Override line height */
  lineHeight?: number;
  /** Override letter spacing */
  letterSpacing?: number;
  /** Custom styles */
  style?: React.CSSProperties;
}

export interface CardContentBodyProps {
  children: React.ReactNode;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  style?: React.CSSProperties;
}

export interface CardContentFooterProps {
  children: React.ReactNode;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  style?: React.CSSProperties;
}

export interface CardContentDividerProps {
  width?: number | string;
  height?: number;
  color?: string;
  opacity?: number;
  animate?: boolean;
  style?: React.CSSProperties;
}

export interface CardContentAccentDotsProps {
  count?: 3 | 5;
  size?: number;
  color?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

export interface CardContentShimmerProps {
  startFrame?: number;
  height?: string;
  color?: string;
  style?: React.CSSProperties;
}

/** Header — large, bold, for key statements */
export const CardContentHeader: React.FC<CardContentHeaderProps> = ({
  children,
  fontSize = tokens.fontSizes.display,
  fontWeight = tokens.fontWeights.bold,
  color = tokens.colors.dark,
  lineHeight = tokens.lineHeights.tight,
  letterSpacing = tokens.letterSpacing.tight,
  style,
}) => (
  <div
    style={{
      fontSize,
      fontWeight,
      color,
      lineHeight,
      letterSpacing,
      textAlign: "center",
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "0.04em",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Body — supporting text */
export const CardContentBody: React.FC<CardContentBodyProps> = ({
  children,
  fontSize = tokens.fontSizes.xxl,
  fontWeight = tokens.fontWeights.medium,
  color = tokens.colors.darkMuted,
  lineHeight = tokens.lineHeights.normal,
  letterSpacing = tokens.letterSpacing.normal,
  style,
}) => (
  <div
    style={{
      fontSize,
      fontWeight,
      color,
      lineHeight,
      letterSpacing,
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Footer — attribution, metadata */
export const CardContentFooter: React.FC<CardContentFooterProps> = ({
  children,
  fontSize = tokens.fontSizes.md,
  fontWeight = tokens.fontWeights.regular,
  color = tokens.colors.darkFaint,
  style,
}) => (
  <div
    style={{
      fontSize,
      fontWeight,
      color,
      textAlign: "center",
      marginTop: tokens.space.sm,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Divider — decorative line */
export const CardContentDivider: React.FC<CardContentDividerProps> = ({
  width = 80,
  height = 3,
  color = tokens.colors.accent,
  opacity = 0.7,
  animate = false,
  style,
}) => {
  // Note: animation requires frame access — use in animated context
  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        borderRadius: height / 2,
        opacity,
        ...style,
      }}
    />
  );
};

/** Accent dots — decorative */
export const CardContentAccentDots: React.FC<CardContentAccentDotsProps> = ({
  count = 3,
  size = 8,
  color = tokens.colors.accent,
  animate = false,
  style,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginTop: tokens.space.sm,
        pointerEvents: "none",
        ...style,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            width: size - (i % 2) * 2,
            height: size - (i % 2) * 2,
            borderRadius: "50%",
            backgroundColor: color,
            opacity: i % 2 === 0 ? 1 : 0.6,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
};

/** Shimmer — animated highlight sweep */
export const CardContentShimmer: React.FC<CardContentShimmerProps> = ({
  startFrame = 0,
  height = "18%",
  color = `${tokens.colors.accent}33`,
  style,
}) => {
  // This needs frame context — typically used inside a component with useCurrentFrame
  // For now, render static; feature component can wrap with animation
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height,
        background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
        borderRadius: "inherit",
        pointerEvents: "none",
        opacity: 0, // Hidden by default; feature component animates
        ...style,
      }}
    />
  );
};

/** Namespace export for clean imports */
export const CardContent = {
  Header: CardContentHeader,
  Body: CardContentBody,
  Footer: CardContentFooter,
  Divider: CardContentDivider,
  AccentDots: CardContentAccentDots,
  Shimmer: CardContentShimmer,
};
