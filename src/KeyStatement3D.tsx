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
import { fitText } from "@remotion/layout-utils";

// Google Font — type-safe, blocks rendering until the font is ready.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface KeyStatement3DProps {
  text: string;
  emphasisWords: string[];
  durationInFrames?: number; // Optional override; defaults to composition duration
  exitDirection?: "up" | "down" | "left" | "right";
  // Timing percentages for internal animation only
  wordDurPct?: number;
  wordStaggerPct?: number;
  textStartDelayPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_COLOR_LIGHT = "#f97316";
const ACCENT_GLOW = "rgba(232, 108, 0, 0.4)";
const DARK_TEXT = "#1a1a1a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

// 3D stage depth
const PERSPECTIVE = 1400;

// Parallax layer depths (px on the Z axis, relative to the card face)
const DEPTH_GLOW = -70;
const DEPTH_PATTERN = -30;
const DEPTH_SLIDER = -30;
const DEPTH_RADIAL = -15;
const DEPTH_TOPBAR = 4;
const DEPTH_BOTTOM_DECOR = 8;
const DEPTH_TOP_DOTS = 10;
const DEPTH_SHIMMER = 35;
const EMPHASIS_REST_Z = 18; // Emphasized words hover above the card face

// Rough-notation variety — cycle annotation style per emphasized word
const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_COLOR_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

export const KeyStatement3D: React.FC<KeyStatement3DProps> = ({
  text,
  emphasisWords,
  durationInFrames: propsDurationInFrames,
  exitDirection = "up",
  wordDurPct = 0.08,
  wordStaggerPct = 0.03,
  textStartDelayPct = 0.05,
  sliderDurPct = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — completes by ~50%, then holds
  // No exit animation — designed to be wrapped by SceneTransition
  // ============================================
  const wordDuration = Math.round(durationInFrames * wordDurPct);
  const wordStagger = Math.round(durationInFrames * wordStaggerPct);
  const textStartDelay = Math.round(durationInFrames * textStartDelayPct);
  const words = text.split(" ");
  const totalWords = words.length;
  const textEndFrame = textStartDelay + (totalWords - 1) * wordStagger + wordDuration;
  const sliderStart = textEndFrame;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Card entrance — lands into the 3D stage (tilt + lift settling flat)
  const cardEntranceDuration = Math.max(12, Math.round(durationInFrames * 0.07));

  // Idle state — everything time-based from here on
  const isIdle = frame > textEndFrame;

  // Smoothly blend idle amplitudes in over ~25 frames to avoid a jump at the flip
  const idleBlend = interpolate(frame, [textEndFrame, textEndFrame + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Split text into words and mark emphasis
  const emphasisSet = new Set(emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")));

  // Assign an annotation style to each emphasized word (cycles Highlight → Circle → Underline)
  let emphasisRunIndex = 0;
  const wordAnnotations = words.map((word) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, "");
    if (!emphasisSet.has(cleanWord)) return null;
    const entry = ANNOTATION_CYCLE[emphasisRunIndex % ANNOTATION_CYCLE.length];
    emphasisRunIndex += 1;
    return entry;
  });

  // ---- Card entrance + orbital idle drift (order-sensitive multi-transform chain,
  // ---- so a transform string is used here per timing.md guidance)
  const entranceProgress = interpolate(frame, [0, cardEntranceDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardEnterScale = interpolate(frame, [0, cardEntranceDuration], [0.92, 1], {
    easing: Easing.spring({ damping: 200 }),
    output: "perceptual-scale",
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Gentle combined orbit — feels like floating in space rather than nodding
  const idleTiltX = Math.sin(frame * 0.045) * 2.2 * idleBlend;
  const idleTiltY = Math.cos(frame * 0.032) * 1.6 * idleBlend;
  // Idle breathing bounce along Y
  const cardBounceOffset = Math.sin(frame * 0.08 * Math.PI * 2) * 6 * idleBlend;
  const orbitTransform = `rotateX(${(1 - entranceProgress) * 9 + idleTiltX}deg) rotateY(${idleTiltY}deg) translateY(${(1 - entranceProgress) * -26 + cardBounceOffset}px) scale(${cardEnterScale})`;

  // Glow pulse (idle) — blended smoothly
  const glowPulse = 1 + idleBlend * 0.15 * Math.sin(frame * 0.03);
  const glowOpacity = 0.5 + idleBlend * (0.1 + 0.2 * Math.sin(frame * 0.05));

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(48, width * 0.044);
  const cardBorderRadius = Math.max(32, width * 0.03);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerMinHeight = 400; // Minimum card height — grows with content
  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Auto-fit text sizing — the longest word must fit the card's text area.
  const textAreaWidth = containerWidth - 2 * cardPadding;
  const longestWord = words.reduce(
    (longest, current) => (current.length > longest.length ? current : longest),
    ""
  );
  const fittedSize = fitText({
    text: longestWord,
    withinWidth: textAreaWidth,
    fontFamily,
    fontWeight: "700",
  }).fontSize;
  const baseFontSize = Math.min(Math.max(64, width * 0.059), fittedSize * 0.85);
  const emphasisFontSize = Math.min(Math.max(76, width * 0.07), fittedSize);

  // Shimmer timing
  const shimmerSpeed = 25;
  const shimmerStart = textEndFrame;

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

  // Decorative accent elements (with optional Z-depth for parallax)
  const AccentDot = ({
    size = 8,
    color = ACCENT_COLOR,
    baseDelay = 0,
    opacity = 1,
    animate = false,
    depth = 0,
  }) => {
    const pulse = animate && isIdle ? 1 + 0.3 * Math.sin(frame * 0.2 + baseDelay) : 1;
    const float = animate && isIdle ? 4 * Math.sin(frame * 0.15 + baseDelay) : 0;

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: opacity * pulse,
          translate: `0px ${float}px ${depth}px`,
          flexShrink: 0,
          filter:
            animate && isIdle
              ? `drop-shadow(0 0 ${4 + 2 * Math.sin(frame * 0.1 + baseDelay)}px ${ACCENT_GLOW})`
              : "none",
        }}
      />
    );
  };

  // Decorative line separator
  const DecorativeLine = ({
    width: lineWidth = 60,
    height: lineHeight = 2,
    color = ACCENT_COLOR,
    opacity: lineOpacity = 1,
    animate = false,
    depth = 0,
  }) => {
    const pulse =
      animate && isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.08) : lineOpacity;
    const glow =
      animate && isIdle
        ? `drop-shadow(0 0 ${4 + 2 * Math.sin(frame * 0.1)}px ${ACCENT_GLOW})`
        : "none";

    return (
      <div
        style={{
          width: lineWidth,
          height: lineHeight,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          borderRadius: lineHeight / 2,
          opacity: pulse,
          translate: `0px 0px ${depth}px`,
          filter: glow,
        }}
      />
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
          translate: "0px -50%",
          width: availableWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* 3D stage — perspective makes descendant translateZ produce real depth */}
        <div
          style={{
            position: "relative",
            width: containerWidth,
            perspective: PERSPECTIVE,
          }}
        >
          {/* Fade wrapper — kept OUTSIDE the preserve-3d chain so the entrance
              opacity fade never flattens the card's parallax layers */}
          <div
            style={{
              opacity: interpolate(frame, [0, cardEntranceDuration], [0, 1], {
                easing: easeOut,
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {/* Orbit — card lands into the stage, then drifts on a slow combined orbit */}
            <div
              style={{
                transformStyle: "preserve-3d",
                transform: orbitTransform,
                willChange: "transform",
              }}
            >
              {/* Slider border — sits slightly BEHIND the card face for depth */}
              <div
                style={{
                  position: "absolute",
                  inset: -sliderPadding,
                  pointerEvents: "none",
                  translate: `0px 0px ${DEPTH_SLIDER}px`,
                  border: `${sliderStrokeWidth}px solid ${SLIDER_COLOR}`,
                  borderRadius: sliderBorderRadius,
                  boxSizing: "border-box",
                  opacity: interpolate(frame, [sliderStart, sliderStart + 10], [0, 1], {
                    easing: easeOut,
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  scale: interpolate(
                    frame,
                    [sliderStart, sliderStart + sliderDuration],
                    [0.94, 1],
                    {
                      easing: Easing.spring({ damping: 200 }),
                      output: "perceptual-scale",
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }
                  ),
                  filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
                }}
              />

              {/* Elevated card — preserve-3d lets inner layers parallax */}
              <div
                style={{
                  position: "relative",
                  minHeight: containerMinHeight,
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
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Accent top bar with matching curved corners — slightly lifted */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    translate: `0px 0px ${DEPTH_TOPBAR}px`,
                    background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                    borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
                  }}
                />

                {/* Subtle background pattern - diagonal lines, pushed back for parallax */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    translate: `0px 0px ${DEPTH_PATTERN}px`,
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
                    translate: `0px 0px ${DEPTH_RADIAL}px`,
                    borderRadius: cardBorderRadius,
                    background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.02) 100%)`,
                    pointerEvents: "none",
                  }}
                />

                {/* Glow behind card — deepest layer, breathes during idle */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    translate: `0px 0px ${DEPTH_GLOW}px`,
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
                      borderRadius: cardBorderRadius,
                      background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)`,
                      opacity: glowOpacity,
                      filter: `blur(60px)`,
                      scale: glowPulse,
                    }}
                  />
                </div>

                {/* Decorative accent dots at top — floated above the surface */}
                <div
                  style={{
                    position: "absolute",
                    top: cardPadding - 10,
                    left: "50%",
                    translate: `-50% 0px ${DEPTH_TOP_DOTS}px`,
                    display: "flex",
                    gap: 8,
                    pointerEvents: "none",
                  }}
                >
                  <AccentDot size={6} baseDelay={0} animate={true} />
                  <AccentDot size={8} baseDelay={0.5} animate={true} />
                  <AccentDot size={6} baseDelay={1} animate={true} />
                </div>

                {/* Text block */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    style={{
                      fontSize: baseFontSize,
                      fontWeight: 500,
                      fontFamily,
                      color: DARK_TEXT,
                      lineHeight: 1.3,
                      letterSpacing: -1.5,
                      textAlign: "center",
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: "0.08em",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {words.map((word, i) => {
                      const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, "");
                      const isEmphasized = emphasisSet.has(cleanWord);
                      const annotation = wordAnnotations[i];

                      // Word entrance window
                      const wordStartFrame = textStartDelay + i * wordStagger;
                      const wordEndFrame = wordStartFrame + wordDuration;

                      // ---- 3D flight parameters (per-word variety, deterministic) ----
                      // Each word starts deep behind the screen and flies toward the viewer
                      const flightDepth = -(520 + (i % 3) * 140); // -520 / -660 / -800
                      const driftX = (i % 2 === 0 ? -1 : 1) * 36; // converge from alternating sides
                      const restZ = isEmphasized ? EMPHASIS_REST_Z : 0;

                      const entranceZ = interpolate(
                        frame,
                        [wordStartFrame, wordEndFrame],
                        [flightDepth, restZ],
                        {
                          easing: easeOutExpo,
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        }
                      );
                      const entranceX = interpolate(
                        frame,
                        [wordStartFrame, wordEndFrame],
                        [driftX, 0],
                        {
                          easing: easeOutExpo,
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        }
                      );

                      // Emphasized words hover above the card with a slow Z-bob during idle
                      const zBob =
                        isIdle && isEmphasized ? Math.sin(frame * 0.09 + i) * 5 : 0;

                      // Idle animations for emphasized words (2D, applied to the word itself)
                      const bounceOffset =
                        isIdle && isEmphasized
                          ? Math.sin(frame * 0.25 * Math.PI * 2) * 4
                          : 0;
                      const idleScalePulse =
                        isIdle && isEmphasized ? 1 + 0.03 * Math.sin(frame * 0.12 + i) : 1;
                      const emphasisFloat =
                        isIdle && isEmphasized ? 3 * Math.sin(frame * 0.08 + i) : 0;

                      // Filter chain: entrance blur (+ idle glow for emphasized words).
                      // Glow uses drop-shadow because text-shadow breaks under background-clip: text.
                      const wordFilter = [
                        `blur(${interpolate(frame, [wordStartFrame, wordEndFrame], [14, 0], {
                          easing: easeOutExpo,
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        })}px)`,
                        ...(isIdle && isEmphasized
                          ? [
                              `drop-shadow(0 0 ${8 + 4 * Math.sin(frame * 0.15 + i)}px ${ACCENT_GLOW})`,
                              `drop-shadow(0 0 ${16 + 8 * Math.sin(frame * 0.1 + i)}px ${ACCENT_GLOW})`,
                            ]
                          : []),
                      ].join(" ");

                      const wordContent = (
                        <span
                          style={{
                            display: "inline-block",
                            opacity: interpolate(
                              frame,
                              [wordStartFrame, wordStartFrame + Math.max(4, Math.round(wordDuration * 0.45))],
                              [0, 1],
                              {
                                easing: easeOutExpo,
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                              }
                            ),
                            translate: `0px ${
                              interpolate(frame, [wordStartFrame, wordEndFrame], [40, 0], {
                                easing: easeOutExpo,
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                              }) +
                              bounceOffset +
                              emphasisFloat
                            }px`,
                            scale:
                              interpolate(frame, [wordStartFrame, wordEndFrame], [0.88, 1], {
                                easing: easeOutExpo,
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                                output: "perceptual-scale",
                              }) * idleScalePulse,
                            rotate: `${interpolate(frame, [wordStartFrame, wordEndFrame], [-4, 0], {
                              easing: easeOutExpo,
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                            })}deg`,
                            transformOrigin: "center bottom",
                            fontSize: isEmphasized ? emphasisFontSize : baseFontSize,
                            fontWeight: isEmphasized ? 700 : 500,
                            fontFamily,
                            lineHeight: 1.3,
                            margin: "0 0.04em",
                            // Gradient text for emphasis, flat dark for regular words
                            ...(isEmphasized
                              ? {
                                  backgroundImage: `linear-gradient(120deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                                  WebkitBackgroundClip: "text",
                                  backgroundClip: "text",
                                  WebkitTextFillColor: "transparent",
                                }
                              : { color: DARK_TEXT }),
                            filter: wordFilter,
                            willChange: "transform, opacity, filter",
                          }}
                        >
                          {word}
                          {i < totalWords - 1 ? " " : ""}
                        </span>
                      );

                      // Wrap emphasized words with cycling rough-notation annotations.
                      // The Z-flight lives on THIS wrapper (we control it and can keep
                      // preserve-3d) because rough-notation's internals flatten their subtree.
                      if (isEmphasized && annotation) {
                        const AnnotationComponent = annotation.Component;
                        return (
                          <span
                            key={i}
                            style={{
                              display: "inline-block",
                              transformStyle: "preserve-3d",
                              translate: `${entranceX}px 0px ${entranceZ + zBob}px`,
                              willChange: "transform",
                            }}
                          >
                            <AnnotationComponent
                              color={annotation.color}
                              strokeWidth={3}
                              padding={6}
                              progress={interpolate(
                                frame,
                                [wordStartFrame, wordEndFrame + 5],
                                [0, 1],
                                {
                                  easing: easeOutExpo,
                                  extrapolateLeft: "clamp",
                                  extrapolateRight: "clamp",
                                }
                              )}
                            >
                              {wordContent}
                            </AnnotationComponent>
                          </span>
                        );
                      }

                      // Regular words carry the full 3D flight on themselves
                      return (
                        <span
                          key={i}
                          style={{
                            display: "inline-block",
                            transformStyle: "preserve-3d",
                            translate: `${entranceX}px 0px ${entranceZ}px`,
                            willChange: "transform",
                          }}
                        >
                          {wordContent}
                        </span>
                      );
                    })}
                  </div>

                  {/* Decorative separator line — slightly lifted */}
                  <div style={{ transformStyle: "preserve-3d" }}>
                    <DecorativeLine
                      width={80}
                      height={3}
                      color={ACCENT_COLOR}
                      opacity={isIdle ? 0.7 : 0.4}
                      animate={true}
                      depth={DEPTH_BOTTOM_DECOR}
                    />
                  </div>

                  {/* Accent dots below text — slightly lifted */}
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 8,
                      pointerEvents: "none",
                      translate: `0px 0px ${DEPTH_BOTTOM_DECOR}px`,
                    }}
                  >
                    <AccentDot size={5} baseDelay={0.2} animate={true} />
                    <AccentDot size={7} baseDelay={0.7} animate={true} />
                    <AccentDot size={5} baseDelay={1.2} animate={true} />
                  </div>
                </div>

                {/* Shimmer animation on card — floats above the surface, only visible after start */}
                <div
                  style={{
                    position: "absolute",
                    top: getShimmerTop(shimmerStart),
                    left: 0,
                    width: "100%",
                    height: "18%",
                    translate: `0px 0px ${DEPTH_SHIMMER}px`,
                    background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
                    opacity: getShimmerOpacity(shimmerStart),
                    borderRadius: cardBorderRadius,
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const KeyStatement3DTestComposition: React.FC = () => (
  <Composition
    id="KeyStatement3DTest"
    component={KeyStatement3D}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      emphasisWords: ["scarce"],
    }}
  />
);

// Test with longer text and multiple emphasis words
export const KeyStatement3DLongTest: React.FC = () => (
  <Composition
    id="KeyStatement3DLongTest"
    component={KeyStatement3D}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "People who are really serious about software should make their own hardware",
      emphasisWords: ["serious", "software", "hardware"],
    }}
  />
);

// Test with short punchy statement
export const KeyStatement3DShortTest: React.FC = () => (
  <Composition
    id="KeyStatement3DShortTest"
    component={KeyStatement3D}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The future is already here",
      emphasisWords: ["future"],
    }}
  />
);
