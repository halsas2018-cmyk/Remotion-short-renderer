import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { Highlight, Circle, Underline } from "@remotion/rough-notation";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { useIdleMotion } from "./lib/idleMotion";

interface PlainTextProps {
  text: string;
  emphasisWords?: string[]; // NEW: optional emphasis words for highlighting
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  lineDurPct?: number;
  lineStaggerPct?: number;
  textStartDelayPct?: number;
  sliderDurPct?: number;
}

// Google Font — type-safe, blocks rendering until the font is ready.
// Space Grotesk: geometric display face, punchy for kinetic typography.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const ACCENT_GLOW = "rgba(232, 108, 0, 0.4)";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const LIGHT_TEXT = "#a3a3a3";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_SHADOW_HOVER = "0 20px 50px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

// Rough-notation variety — cycle annotation style per emphasized word (matches KeyStatement)
const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

export const PlainText: React.FC<PlainTextProps> = ({
  text,
  emphasisWords = [], // NEW: default empty array
  durationInFrames: propsDurationInFrames,
  // CLAUDE.md Rule 1: Text cards must complete entrance by 50% of durationInFrames
  // Adjusted to target ~45-50% for typical line counts (consistent with KeyStatement)
  lineDurPct = 0.10,         // 10% per line (was 12%)
  lineStaggerPct = 0.035,    // 3.5% stagger between lines (was 4%)
  textStartDelayPct = 0.05,  // 5% initial delay
  // CLAUDE.md Rule 3: Slider starts at textEndFrame, duration ~45%
  sliderDurPct = 0.45,       // 45% for slider (starts at ~50%, ends at ~95%)
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // Split text into words and group into lines of 4-5 words
  const words = text.split(" ");
  const wordsPerLine = 4;
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  const totalLines = lines.length;

  // ============================================
  // INTERNAL TIMELINE — CLAUDE.md compliant
  // Text card: entrance completes by 50% of durationInFrames
  // No exit animation (Rule 2) — designed to be wrapped by SceneTransition
  // Slider starts at textEndFrame, runs 45% (Rule 3)
  // ============================================
  const lineDuration = Math.round(durationInFrames * lineDurPct);
  const lineStagger = Math.round(durationInFrames * lineStaggerPct);
  const textStartDelay = Math.round(durationInFrames * textStartDelayPct);
  const textEndFrame = textStartDelay + (totalLines - 1) * lineStagger + lineDuration;
  const sliderStart = textEndFrame;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Idle pulse — time-based
  const isIdle = frame > textEndFrame;
  const idleTimeSeconds = isIdle ? (frame - textEndFrame) / fps : 0;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Shimmer timing
  const shimmerSpeed = 25;
  const shimmerStart = textEndFrame;

  const idle = useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false });

  // Glow pulse animation (idle)
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(48, width * 0.044);
  const cardBorderRadius = Math.max(32, width * 0.03);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = 400; // Approximate card height
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const baseFontSize = Math.max(56, width * 0.052); // Main headline: 84px minimum

  // Shimmer position calculation - relative to card (0-100% of card height)
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

  // Shimmer opacity - 0 before start, then 1
  const getShimmerOpacity = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return 0;
    return 1;
  };

  // Slider path animation
  const sliderPerimeter = 2 * (sliderWidth + sliderHeight) - 8 * sliderBorderRadius + Math.PI * 2 * sliderBorderRadius;
  const sliderDashArray = `${sliderPerimeter} ${sliderPerimeter}`;
  const sliderDashOffset = sliderPerimeter * (1 - interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));

  // Slider progress
  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // NEW: Build emphasis set and assign annotations per line (like KeyStatement)
  const emphasisSet = new Set(emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")));
  let emphasisRunIndex = 0;
  const lineAnnotations = lines.map((line) => {
    const lineWords = line.split(" ");
    const hasEmphasis = lineWords.some((w) => emphasisSet.has(w.toLowerCase().replace(/[.,!?;:]$/, "")));
    if (!hasEmphasis) return null;
    const entry = ANNOTATION_CYCLE[emphasisRunIndex % ANNOTATION_CYCLE.length];
    emphasisRunIndex += 1;
    return entry;
  });

  // Star SVG component with animated rotation
  const Star = ({ 
    size = 20, 
    color = ACCENT_COLOR, 
    baseRotation = 0, 
    opacity = 1,
    animate = false 
  }) => {
    const rotation = animate && isIdle 
      ? frame * 30 + baseRotation 
      : baseRotation;
    const pulse = animate && isIdle 
      ? 1 + 0.15 * Math.sin(frame * 0.15 + baseRotation * 0.01) 
      : 1;
    
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          transform: `rotate(${rotation}deg) scale(${pulse})`,
          opacity,
          flexShrink: 0,
          marginRight: 16,
          filter: animate && isIdle ? `drop-shadow(0 0 8px ${ACCENT_GLOW})` : "none",
        }}
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={color}
        />
      </svg>
    );
  };

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          transform: "translateY(-50%)",
          width: availableWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Card container - explicit dimensions matching card outer size */}
        <div
          style={{
            position: "relative",
            width: containerWidth,
            minHeight: containerHeight,
          }}
        >
          {/* Slider animation - black border circling the card with matching curved corners */}
          <div
            style={{
              position: "absolute",
              top: -sliderPadding,
              left: -sliderPadding,
              right: -sliderPadding,
              bottom: -sliderPadding,
              pointerEvents: "none",
              opacity: sliderProgress,
              filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
              borderRadius: sliderBorderRadius,
            }}
          >
            <svg
              width={sliderWidth}
              height={sliderHeight}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <rect
                x={sliderStrokeWidth / 2}
                y={sliderStrokeWidth / 2}
                width={sliderWidth - sliderStrokeWidth}
                height={sliderHeight - sliderStrokeWidth}
                rx={sliderBorderRadius}
                ry={sliderBorderRadius}
                fill="none"
                stroke={SLIDER_COLOR}
                strokeWidth={sliderStrokeWidth}
                strokeDasharray={sliderDashArray}
                strokeDashoffset={sliderDashOffset}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* Elevated card for the plain text - with prominent curved borders */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              padding: cardPadding,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              transform: [
                { translateY: idle.translateY },
                { rotateX: idle.rotateX },
              ],
            }}
          >
            {/* Accent top bar with matching curved corners */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${ACCENT_COLOR}, #f97316)`,
                borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
              }}
            />

            {/* Subtle background pattern - diagonal lines */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: cardBorderRadius,
                opacity: 0.03,
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  ${ACCENT_COLOR} 0,
                  ${ACCENT_COLOR} 1px,
                  transparent 1px,
                  transparent 20px
                )`,
                pointerEvents: "none",
              }}
            />

            {/* Subtle radial gradient overlay for depth */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: cardBorderRadius,
                background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.02) 100%)`,
                pointerEvents: "none",
              }}
            />

            {/* Glow behind card */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${glowPulse})`,
                width: "110%",
                height: "110%",
                borderRadius: cardBorderRadius,
                background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)`,
                opacity: glowOpacity,
                filter: `blur(60px)`,
                pointerEvents: "none",
                zIndex: -1,
              }}
            />

            {/* Text content - lines of 4-5 words */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {lines.map((line, i) => {
                // Line entrance animation
                const lineStartFrame = textStartDelay + i * lineStagger;
                const lineEndFrame = lineStartFrame + lineDuration;
                
                const lineProgress = interpolate(frame, [lineStartFrame, lineEndFrame], [0, 1], {
                  easing: easeOutExpo,
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                
                const lineOpacity = lineProgress;
                const lineY = interpolate(lineProgress, [0, 1], [40, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const lineScale = interpolate(lineProgress, [0, 1], [0.8, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const lineRotation = interpolate(lineProgress, [0, 1], [-3, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                
                // Idle animation for lines: subtle vertical drift
                const lineIdleDrift = isIdle ? 3 * Math.sin(frame * 0.05 + i * 0.7) : 0;
                const lineIdleScale = isIdle ? 1 + 0.01 * Math.sin(frame * 0.07 + i) : 1;

                // Star animation
                const starRotation = isIdle ? frame * 20 + i * 45 : i * 45;
                const starPulse = isIdle ? 1 + 0.2 * Math.sin(frame * 0.12 + i) : 1;
                const starGlow = isIdle ? `drop-shadow(0 0 ${6 + 4 * Math.sin(frame * 0.1 + i)}px ${ACCENT_GLOW})` : "none";

                // Check if this line has emphasis
                const annotation = lineAnnotations[i];
                const lineHasEmphasis = !!annotation;

                // Line content with optional rough-notation wrapper
                const lineContent = (
                  <span
                    style={{
                      fontSize: baseFontSize,
                      fontWeight: lineHasEmphasis ? 700 : 500,
                      color: DARK_TEXT,
                      fontFamily,
                      lineHeight: 1.4,
                      letterSpacing: -1,
                      textAlign: "center",
                      textShadow: isIdle ? `0 0 ${2 + Math.sin(frame * 0.08 + i) * 2}px rgba(232, 108, 0, 0.15)` : "none",
                      // Gradient text for emphasized lines (optional visual cue)
                      ...(lineHasEmphasis
                        ? {
                            backgroundImage: `linear-gradient(120deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }
                        : {}),
                    }}
                  >
                    {line}
                  </span>
                );

                // Wrap with rough-notation if emphasized
                const renderedLine = lineHasEmphasis && annotation ? (
                  <annotation.Component
                    key={i}
                    color={annotation.color}
                    strokeWidth={3}
                    padding={6}
                    progress={interpolate(
                      frame,
                      [lineStartFrame, lineEndFrame + 5],
                      [0, 1],
                      {
                        easing: easeOutExpo,
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }
                    )}
                  >
                    {lineContent}
                  </annotation.Component>
                ) : (
                  <span key={i}>{lineContent}</span>
                );

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: lineOpacity,
                      transform: `translateY(${lineY + lineIdleDrift}px) scale(${lineScale * lineIdleScale}) rotate(${lineRotation}deg)`,
                      transformOrigin: "center",
                      willChange: "transform, opacity",
                    }}
                  >
                    <Star
                      size={22}
                      color={ACCENT_COLOR}
                      baseRotation={i * 45}
                      opacity={lineOpacity * starPulse}
                      animate={true}
                    />
                    {renderedLine}
                    <Star
                      size={22}
                      color={ACCENT_COLOR}
                      baseRotation={180 + i * 45}
                      opacity={lineOpacity * starPulse}
                      animate={true}
                    />
                  </div>
                );
              })}
            </div>

            {/* Decorative accent line at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: cardPadding + 20,
                left: "50%",
                transform: "translateX(-50%)",
                width: 80,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)`,
                borderRadius: 2,
                opacity: isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.4,
              }}
            />

            {/* Shimmer animation on card - properly positioned within card, only visible after start */}
            <div
              style={{
                position: "absolute",
                top: getShimmerTop(shimmerStart),
                left: 0,
                width: "100%",
                height: "18%",
                background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                opacity: getShimmerOpacity(shimmerStart),
                borderRadius: cardBorderRadius,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Test composition for isolated preview/render
export const PlainTextTestComposition: React.FC = () => (
  <Composition
    id="PlainTextTest"
    component={PlainText}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      emphasisWords: ["scarce"], // NEW: test emphasis
      durationInFrames: 120,
    }}
  />
);

// Test with longer text
export const PlainTextLongTest: React.FC = () => (
  <Composition
    id="PlainTextLongTest"
    component={PlainText}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "People who are really serious about software should make their own hardware",
      emphasisWords: ["serious", "software", "hardware"], // NEW: test multiple emphasis
      durationInFrames: 180,
    }}
  />
);

// Test with short punchy text
export const PlainTextShortTest: React.FC = () => (
  <Composition
    id="PlainTextShortTest"
    component={PlainText}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The future is already here",
      emphasisWords: ["future"], // NEW: test emphasis
      durationInFrames: 90,
    }}
  />
);
