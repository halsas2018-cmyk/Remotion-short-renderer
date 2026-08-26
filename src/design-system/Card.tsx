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
  /** Video width for responsive calculations (optional, uses useVideoConfig if not provided) */
  videoWidth?: number;
}

/**
 * Card — Centralized card shell matching KeyStatement exactly.
 * Picks a variant, applies entrance/idle animations, renders children.
 * Feature components ONLY write animation logic for their content.
 */
export const Card: React.FC<CardProps> = ({
  variant = "accent",
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
  videoWidth: providedVideoWidth,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();

  // Use provided videoWidth or fall back to useVideoConfig
  const vw = providedVideoWidth ?? videoWidth;

  // Resolve variant + overrides
  const v = getVariant(variant);
  const entrancePreset = entrance ?? v.entrance;
  const idlePreset = idle ?? v.idle;
  const resolvedEntranceDuration = entranceDuration ?? Math.max(12, Math.round((fps * 0.9)));
  const resolvedIdleStart = idleStartFrame ?? resolvedEntranceDuration;

  // Responsive calculations — exact KeyStatement formulas
  const containerPadding = Math.max(80, vw * 0.11);
  const availableWidth = vw - 2 * containerPadding;
  const cardWidth = width === "full" ? availableWidth : (width ?? availableWidth);

  const resolvedBorderRadius = borderRadius ?? Math.max(tokens.card.minBorderRadius, vw * tokens.card.borderRadiusRatio);
  const resolvedPadding = padding ?? Math.max(tokens.card.minPadding, vw * tokens.card.paddingRatio);
  const resolvedMinHeight = minHeight ?? tokens.card.minContainerHeight;

  // Slider calculations
  const sliderPadding = v.slider?.padding ?? tokens.card.sliderPadding;
  const sliderBorderRadius = resolvedBorderRadius + resolvedPadding + sliderPadding;
  const sliderStrokeWidth = Math.max(
    tokens.card.minSliderStrokeWidth,
    vw * (v.slider?.strokeWidthRatio ?? tokens.card.sliderStrokeWidthRatio)
  );

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
  // IDLE ANIMATIONS — KeyStatement exact
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
        return {
          translate: "0px 0px",
          scale,
          rotate: "0deg",
        };
      }
      case "keyStatement": {
        // Exact KeyStatement idle: bounce + subtle 3D tilt
        const cardBounceFrequency = 0.08;
        const cardBounceAmplitude = 6;
        const cardTiltDeg = Math.sin(frame * 0.05) * 2;
        const bounceOffset = Math.sin(frame * cardBounceFrequency * Math.PI * 2) * cardBounceAmplitude;
        return {
          translate: `0px ${bounceOffset}px`,
          rotate: `perspective(1200px) rotateX(${cardTiltDeg}deg)`,
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
  // RENDER — KeyStatement exact structure
  // ============================================
  return (
    <AbsoluteFill
      style={{
        width: vw,
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
        {/* Wrapper — in-flow, grows with the card's natural content height */}
        <div
          style={{
            position: "relative",
            width: "100%",
            perspective: 1200,
          }}
        >
          {/* Slider border — pure CSS: negative insets track the wrapper's REAL size */}
          {v.slider && (
            <div
              style={{
                position: "absolute",
                top: -sliderPadding,
                left: -sliderPadding,
                right: -sliderPadding,
                bottom: -sliderPadding,
                pointerEvents: "none",
                border: `${sliderStrokeWidth}px solid ${v.slider.color}`,
                borderRadius: sliderBorderRadius,
                boxSizing: "border-box",
                opacity: interpolate(frame, [resolvedIdleStart, resolvedIdleStart + 10], [0, 1], {
                  easing: Easing.bezier(...tokens.easing.easeOut),
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                scale: interpolate(
                  frame,
                  [resolvedIdleStart, resolvedIdleStart + 60],
                  [0.94, 1],
                  {
                    easing: Easing.spring(tokens.easing.spring),
                    output: "perceptual-scale",
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                ),
                filter: `drop-shadow(0 0 ${v.slider.glowBlur}px ${v.slider.glowColor})`,
              }}
            />
          )}

          {/* Elevated card — normal flow child, height follows content */}
          <div
            style={{
              position: "relative",
              minHeight: resolvedMinHeight,
              backgroundColor: v.background,
              borderRadius: resolvedBorderRadius,
              padding: resolvedPadding,
              boxShadow: v.boxShadow,
              border: `${v.borderWidth}px solid ${v.border}`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: v.contentAlign === "center" ? "center" : v.contentAlign === "start" ? "flex-start" : "flex-end",
              textAlign: v.contentAlign,
              // Entrance: fade + spring pop
              opacity: entranceStyle.opacity ?? 1,
              transform: combinedTransform || "none",
              transformOrigin: "center center",
              willChange: "transform, opacity",
            }}
          >
            {/* Accent top bar with matching curved corners */}
            {v.accentBar && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: v.accentBar.height,
                  background: v.accentBar.background,
                  borderRadius: v.accentBar.borderRadius,
                }}
              />
            )}

            {/* Subtle background pattern - diagonal lines — exact KeyStatement */}
            {v.backgroundPattern && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: resolvedBorderRadius,
                  opacity: v.backgroundPattern.opacity,
                  backgroundImage: `repeating-linear-gradient(
                    ${v.backgroundPattern.angle}deg,
                    ${v.backgroundPattern.color} 0,
                    ${v.backgroundPattern.color} 1px,
                    transparent 1px,
                    transparent ${v.backgroundPattern.size}px
                  )`,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Subtle radial gradient overlay for depth — exact KeyStatement */}
            {v.radialOverlay && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: resolvedBorderRadius,
                  background: v.radialOverlay.background,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Glow behind card — flex-centered wrapper instead of transform — exact KeyStatement */}
            {v.glow && !isStatic && (
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
                    width: `${v.glow.scale * 100}%`,
                    height: `${v.glow.scale * 100}%`,
                    borderRadius: resolvedBorderRadius,
                    background: v.glow.background,
                    opacity: v.glow.opacityBase + v.glow.opacityPulse * Math.sin(frame * 0.05),
                    filter: `blur(${v.glow.blur}px)`,
                    scale: 1 + v.glow.pulseScale * Math.sin(frame * 0.03),
                  }}
                />
              </div>
            )}

            {/* Decorative accent dots at top — exact KeyStatement */}
            {v.topAccentDots && (
              <div
                style={{
                  position: "absolute",
                  top: resolvedPadding - 10,
                  left: "50%",
                  translate: "-50% 0px",
                  display: "flex",
                  gap: v.topAccentDots.gap,
                  pointerEvents: "none",
                }}
              >
                {v.topAccentDots.sizes.map((size, i) => (
                  <div
                    key={i}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: "50%",
                      backgroundColor: v.topAccentDots.color,
                      opacity: 1 + 0.3 * Math.sin(frame * 0.2 + i * 0.5),
                      translate: `0px ${4 * Math.sin(frame * 0.15 + i * 0.5)}px`,
                      flexShrink: 0,
                      filter: `drop-shadow(0 0 ${4 + 2 * Math.sin(frame * 0.1 + i * 0.5)}px ${tokens.colors.accentGlow})`,
                    }}
                  />
                ))}
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

            {/* Shimmer animation on card — exact KeyStatement */}
            {v.shimmer && !isStatic && (
              <div
                style={{
                  position: "absolute",
                  top: frame < resolvedIdleStart ? "-100%" : `${((frame - resolvedIdleStart) / fps * v.shimmer.speed) % 100}%`,
                  left: 0,
                  width: "100%",
                  height: v.shimmer.height,
                  background: `linear-gradient(180deg, transparent, ${v.shimmer.color}, transparent)`,
                  opacity: frame < resolvedIdleStart ? 0 : 1,
                  borderRadius: resolvedBorderRadius,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
