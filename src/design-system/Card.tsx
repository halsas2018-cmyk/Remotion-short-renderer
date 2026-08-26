import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { getVariant, CardVariantName, CardVariant } from "./variants";
import { tokens } from "./tokens";

export interface CardProps {
  /** Variant name — defines all visual properties */
  variant?: CardVariantName;
  /** Override entrance preset */
  entrance?: CardVariant["entrance"];
  /** Override idle preset */
  idle?: CardVariant["idle"];
  /** Custom border radius (overrides variant) */
  borderRadius?: number;
  /** Custom padding (overrides variant) */
  padding?: number;
  /** Custom width */
  width?: number | string;
  /** Custom max width */
  maxWidth?: number | string;
  /** Custom min height */
  minHeight?: number;
  /** Children — typically CardContent components */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Disable all animations (for static captures) */
  static?: boolean;
  /** Entrance duration in frames (default: variant-based) */
  entranceDuration?: number;
  /** Frame where idle animations start (default: after entrance) */
  idleStartFrame?: number;
}

/**
 * Card — Centralized card shell.
 * Picks a variant, applies entrance/idle animations, renders children.
 * Feature components ONLY write animation logic for their content.
 */
export const Card: React.FC<CardProps> = ({
  variant = "elevated",
  entrance,
  idle,
  borderRadius,
  padding,
  width,
  maxWidth,
  minHeight,
  children,
  className,
  style,
  static: isStatic = false,
  entranceDuration,
  idleStartFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();

  // Resolve variant + overrides
  const v = getVariant(variant);
  const entrancePreset = entrance ?? v.entrance;
  const idlePreset = idle ?? v.idle;
  const resolvedBorderRadius = borderRadius ?? v.borderRadius;
  const resolvedPadding = padding ?? v.padding;
  const resolvedEntranceDuration = entranceDuration ?? Math.max(12, Math.round((fps * 0.9)));
  const resolvedIdleStart = idleStartFrame ?? resolvedEntranceDuration;

  // Responsive container width
  const containerPadding = Math.max(80, videoWidth * 0.11);
  const availableWidth = videoWidth - 2 * containerPadding;
  const cardWidth = width === "full" ? availableWidth : (width ?? availableWidth);

  // ============================================
  // ENTRANCE ANIMATIONS
  // ============================================
  const getEntranceStyle = () => {
    if (isStatic || entrancePreset === "none") {
      return { opacity: 1, transform: "none" };
    }

    const progress = interpolate(frame, [0, resolvedEntranceDuration], [0, 1], {
      easing: Easing.bezier(...tokens.easing.easeOut),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const springConfig = {
      easing: Easing.spring(tokens.easing.spring),
      output: "perceptual-scale" as const,
      extrapolateLeft: "clamp" as const,
      extrapolateRight: "clamp" as const,
    };

    switch (entrancePreset) {
      case "fly-in":
        return {
          opacity: progress,
          scale: interpolate(frame, [0, resolvedEntranceDuration], [0.92, 1], springConfig),
          translate: `0px ${interpolate(frame, [0, resolvedEntranceDuration], [40, 0], {
            easing: Easing.bezier(...tokens.easing.easeOutExpo),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
        };
      case "fade-up":
        return {
          opacity: progress,
          translate: `0px ${interpolate(frame, [0, resolvedEntranceDuration], [30, 0], {
            easing: Easing.bezier(...tokens.easing.easeOutExpo),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
        };
      case "scale":
        return {
          opacity: progress,
          scale: interpolate(frame, [0, resolvedEntranceDuration], [0.85, 1], springConfig),
        };
      case "slide-up":
        return {
          opacity: progress,
          translate: `0px ${interpolate(frame, [0, resolvedEntranceDuration], [60, 0], {
            easing: Easing.bezier(...tokens.easing.easeOutExpo),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
        };
      default:
        return { opacity: 1, transform: "none" };
    }
  };

  // ============================================
  // IDLE ANIMATIONS
  // ============================================
  const getIdleStyle = () => {
    if (isStatic || idlePreset === "none" || frame < resolvedIdleStart) {
      return { translate: "0px 0px", rotate: "0deg" };
    }

    const idleT = frame - resolvedIdleStart;
    const t = idleT / fps;

    switch (idlePreset) {
      case "float": {
        const floatY = Math.sin(t * Math.PI * 2 * 0.45) * 6;
        const driftX = Math.sin(t * Math.PI * 2 * 0.31 + 1.2) * 2;
        return {
          translate: `${driftX}px ${floatY}px`,
          rotate: "0deg",
        };
      }
      case "pulse": {
        const scale = 1 + 0.015 * Math.sin(t * Math.PI * 2 * 0.5);
        return {
          translate: "0px 0px",
          scale,
          rotate: "0deg",
        };
      }
      case "tilt": {
        const tiltX = Math.sin(t * Math.PI * 2 * 0.08) * 1.5;
        const tiltY = Math.cos(t * Math.PI * 2 * 0.06) * 1;
        return {
          translate: "0px 0px",
          rotate: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        };
      }
      case "breathe": {
        const scale = 1 + 0.01 * Math.sin(t * Math.PI * 2 * 0.3);
        const shadowIntensity = 0.8 + 0.2 * Math.sin(t * Math.PI * 2 * 0.3);
        return {
          translate: "0px 0px",
          scale,
          boxShadow: v.boxShadow.replace(/0\.1[^,]*/, `0.${Math.round(shadowIntensity * 10)}`),
          rotate: "0deg",
        };
      }
      default:
        return { translate: "0px 0px", rotate: "0deg" };
    }
  };

  const entranceStyle = getEntranceStyle();
  const idleStyle = getIdleStyle();

  // Merge transforms
  const combinedTransform = [
    entranceStyle.translate ? `translate(${entranceStyle.translate})` : "",
    idleStyle.translate ? `translate(${idleStyle.translate})` : "",
    entranceStyle.scale ? `scale(${entranceStyle.scale})` : "",
    idleStyle.scale ? `scale(${idleStyle.scale})` : "",
    idleStyle.rotate ? idleStyle.rotate : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ============================================
  // RENDER
  // ============================================
  return (
    <AbsoluteFill
      style={{
        width: videoWidth,
        height: videoHeight,
        backgroundColor: "transparent",
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: containerPadding,
          right: containerPadding,
          translate: "0px -50%",
          width: cardWidth,
          maxWidth: maxWidth ?? "none",
          display: "flex",
          flexDirection: "column",
          alignItems: v.contentAlign === "center" ? "center" : v.contentAlign === "start" ? "flex-start" : "flex-end",
          textAlign: v.contentAlign,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: minHeight ?? 0,
            backgroundColor: v.background,
            border: `${v.borderWidth}px solid ${v.border}`,
            borderRadius: resolvedBorderRadius,
            padding: resolvedPadding,
            boxShadow: v.boxShadow,
            backdropFilter: v.backdropFilter,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: v.contentAlign === "center" ? "center" : v.contentAlign === "start" ? "flex-start" : "flex-end",
            gap: v.gap,
            // Entrance
            opacity: entranceStyle.opacity ?? 1,
            transform: combinedTransform || "none",
            transformOrigin: "center center",
            willChange: "transform, opacity",
          }}
        >
          {/* Accent top bar */}
          {v.accentBar && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: v.accentBar.height,
                background: v.accentBar.background,
                borderRadius: v.accentBar.borderRadius ?? `${resolvedBorderRadius}px ${resolvedBorderRadius}px 0 0`,
              }}
            />
          )}

          {/* Glow behind card for accent variants */}
          {(variant === "accent" || variant === "accentGlass") && !isStatic && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: -1,
              }}
            >
              <div
                style={{
                  width: "110%",
                  height: "110%",
                  borderRadius: resolvedBorderRadius,
                  background: `radial-gradient(ellipse at center, ${tokens.colors.accentGlow} 0%, transparent 70%)`,
                  opacity: 0.5 + 0.2 * Math.sin(frame * 0.05),
                  filter: "blur(60px)",
                  scale: 1 + 0.15 * Math.sin(frame * 0.03),
                }}
              />
            </div>
          )}

          {/* Children — feature component content */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: v.contentAlign === "center" ? "center" : v.contentAlign === "start" ? "flex-start" : "flex-end",
              gap: v.gap,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
