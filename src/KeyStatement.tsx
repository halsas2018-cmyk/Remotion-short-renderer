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
import { useIdleMotion } from "./lib/idleMotion";

// Google Font — type-safe, blocks rendering until the font is ready.
// Space Grotesk: geometric display face, punchy for kinetic typography.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface KeyStatementProps {
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

// Rough-notation variety — cycle annotation style per emphasized word
const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_COLOR_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

export const KeyStatement: React.FC<KeyStatementProps> = ({
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

  // Card entrance — quick fade + spring pop at the very start
  const cardEntranceDuration = Math.max(12, Math.round(durationInFrames * 0.07));

  // Idle state — everything time-based from here on
  const isIdle = frame > textEndFrame;

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

  // Card idle bounce + subtle 3D tilt (shared useIdleMotion hook)
  const idle = useIdleMotion({
    bounce: isIdle,
    tilt: isIdle,
    glow: false, // glow is a separate element (radial blur); it has its own scale/opacity
  });

  // Fast bouncing animation for emphasized words (idle loop)
  const bounceFrequency = 0.25;
  const bounceAmplitude = 8;

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
  const containerMinHeight = 400; // Minimum card height — grows with content
  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Auto-fit text sizing — the longest word must fit the card's text area.
  // Responsive defaults act as caps; fitted size shrinks them if needed.
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

  // Decorative accent elements
  const AccentDot = ({
    size = 8,
    color = ACCENT_COLOR,
    baseDelay = 0,
    opacity = 1,
    animate = false,
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
          translate: `0px ${float}px`,
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
        {/* Wrapper — in-flow, grows with the card's natural content height */}
        <div
          style={{
            position: "relative",
            width: containerWidth,
            perspective: 1200,
          }}
        >
          {/* Slider border — pure CSS: negative insets track the wrapper's REAL size */}
          <div
            style={{
              position: "absolute",
              inset: -sliderPadding,
              pointerEvents: "none",
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

          {/* Elevated card for the key statement — normal flow child, height follows content */}
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
              // Entrance: fade + spring pop
              opacity: interpolate(frame, [0, cardEntranceDuration], [0, 1], {
                easing: easeOut,
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [0, cardEntranceDuration], [0.92, 1], {
                easing: Easing.spring({ damping: 200 }),
                output: "perceptual-scale",
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              // Idle: bounce + subtle 3D tilt
              translate: `0px ${idle.translateY}px`,
              rotate: `x ${idle.rotateX}deg`,
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
                background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
              }}
            />

            {/* Left vertical accent stripe — signature decoration.
                Narrow gradient bar that hugs the left edge of the card,
                rounded at the ends to match the slider border. */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 20,
                bottom: 20,
                width: 6,
                background: `linear-gradient(180deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                borderRadius: 3,
                boxShadow: `0 0 12px ${ACCENT_GLOW}`,
                pointerEvents: "none",
              }}
            />

            {/* Giant decorative opening quote — top-left corner. */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 24,
                fontSize: 140,
                fontFamily: "Georgia, serif",
                fontWeight: 800,
                lineHeight: 0.8,
                color: ACCENT_COLOR,
                opacity: 0.12,
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 0,
              }}
            >
              &ldquo;
            </div>

            {/* Giant decorative closing quote — bottom-right corner. */}
            <div
              style={{
                position: "absolute",
                bottom: -10,
                right: 24,
                fontSize: 140,
                fontFamily: "Georgia, serif",
                fontWeight: 800,
                lineHeight: 0.8,
                color: ACCENT_COLOR,
                opacity: 0.12,
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 0,
              }}
            >
              &rdquo;
            </div>

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

            {/* Glow behind card — flex-centered wrapper instead of transform */}
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
                  borderRadius: cardBorderRadius,
                  background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)`,
                  opacity: glowOpacity,
                  filter: `blur(60px)`,
                  scale: glowPulse,
                }}
              />
            </div>

            {/* Decorative accent dots at top */}
            <div
              style={{
                position: "absolute",
                top: cardPadding - 10,
                left: "50%",
                translate: "-50% 0px",
                display: "flex",
                gap: 8,
                pointerEvents: "none",
              }}
            >
              <AccentDot size={6} baseDelay={0} animate={true} />
              <AccentDot size={8} baseDelay={0.5} animate={true} />
              <AccentDot size={6} baseDelay={1} animate={true} />
            </div>

            {/* Text card */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
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
                }}
              >
                {words.map((word, i) => {
                  const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, "");
                  const isEmphasized = emphasisSet.has(cleanWord);
                  const annotation = wordAnnotations[i];

                  // Word entrance window
                  const wordStartFrame = textStartDelay + i * wordStagger;
                  const wordEndFrame = wordStartFrame + wordDuration;

                  // Idle animations for emphasized words
                  const bounceOffset =
                    isIdle && isEmphasized
                      ? Math.sin(frame * bounceFrequency * Math.PI * 2) * bounceAmplitude
                      : 0;
                  const idleScalePulse =
                    isIdle && isEmphasized ? 1 + 0.04 * Math.sin(frame * 0.12 + i) : 1;
                  const emphasisFloat =
                    isIdle && isEmphasized ? 3 * Math.sin(frame * 0.08 + i) : 0;

                  // Filter chain: entrance blur (+ idle glow for emphasized words).
                  // Glow uses drop-shadow because text-shadow breaks under background-clip: text.
                  const wordFilter = [
                    `blur(${interpolate(frame, [wordStartFrame, wordEndFrame], [8, 0], {
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
                        opacity: interpolate(frame, [wordStartFrame, wordEndFrame], [0, 1], {
                          easing: easeOutExpo,
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        }),
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
                          interpolate(frame, [wordStartFrame, wordEndFrame], [0.7, 1], {
                            easing: easeOutExpo,
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                            output: "perceptual-scale",
                          }) * idleScalePulse,
                        rotate: `${interpolate(frame, [wordStartFrame, wordEndFrame], [-5, 0], {
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

                  // Wrap emphasized words with cycling rough-notation annotations
                  if (isEmphasized && annotation) {
                    const AnnotationComponent = annotation.Component;
                    return (
                      <AnnotationComponent
                        key={i}
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
                    );
                  }

                  return <span key={i}>{wordContent}</span>;
                })}
              </div>

              {/* Decorative separator line */}
              <DecorativeLine
                width={80}
                height={3}
                color={ACCENT_COLOR}
                opacity={isIdle ? 0.7 : 0.4}
                animate={true}
              />

              {/* Accent dots below text */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 8,
                  pointerEvents: "none",
                }}
              >
                <AccentDot size={5} baseDelay={0.2} animate={true} />
                <AccentDot size={7} baseDelay={0.7} animate={true} />
                <AccentDot size={5} baseDelay={1.2} animate={true} />
              </div>
            </div>

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

export const KeyStatementTestComposition: React.FC = () => (
  <Composition
    id="KeyStatementTest"
    component={KeyStatement}
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
export const KeyStatementLongTest: React.FC = () => (
  <Composition
    id="KeyStatementLongTest"
    component={KeyStatement}
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
export const KeyStatementShortTest: React.FC = () => (
  <Composition
    id="KeyStatementShortTest"
    component={KeyStatement}
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
