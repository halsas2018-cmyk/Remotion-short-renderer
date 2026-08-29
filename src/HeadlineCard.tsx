import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { fitText, measureText } from "@remotion/layout-utils";

/* ------------------------------------------------------------------ */
/*  Google Font — type-safe, blocks rendering until the font is       */
/*  ready. Matches KeyStatement so the two components sit in the     */
/*  same visual family.                                              */
/* ------------------------------------------------------------------ */

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

export const HeadlineCardSchema = z.object({
  text: z.string().min(1),
  emphasisWords: z.array(z.string()).default([]),
  // Optional accent colour (top bar, emphasis rings). Falls back to
  // the same orange used by KeyStatement so the library is consistent.
  accentColor: zColor().default("#e86c00"),
  // Light variant used for gradients / hover.
  accentColorLight: zColor().default("#f97316"),
});

export type HeadlineCardProps = z.infer<typeof HeadlineCardSchema>;

/* ------------------------------------------------------------------ */
/*  Constants — mirror KeyStatement so the design language is one.    */
/* ------------------------------------------------------------------ */

const ACCENT_GLOW = "rgba(232, 108, 0, 0.4)";
const DARK_TEXT = "#1a1a1a";
const CARD_SHADOW =
  "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);

/* ------------------------------------------------------------------ */
/*  Three emphasis annotation shapes, cycled per emphasised word.    */
/*  Same pattern KeyStatement uses.                                  */
/* ------------------------------------------------------------------ */

const ANNOTATION_CYCLE = [
  { name: "highlight" as const, color: "rgba(232, 108, 0, 0.25)" },
  { name: "circle" as const, color: "#f97316" },
  { name: "underline" as const, color: "#e86c00" },
];

type AnnotationStyle = (typeof ANNOTATION_CYCLE)[number];

const renderAnnotation = (
  style: AnnotationStyle,
  children: React.ReactNode,
): React.ReactNode => {
  if (style.name === "highlight") {
    return (
      <span
        style={{
          position: "relative",
          display: "inline-block",
          padding: "2px 4px",
          background: style.color,
          borderRadius: 4,
        }}
      >
        {children}
      </span>
    );
  }
  if (style.name === "circle") {
    return (
      <span
        style={{
          position: "relative",
          display: "inline-block",
          padding: "2px 4px",
          boxShadow: `inset 0 0 0 3px ${style.color}`,
          borderRadius: 999,
        }}
      >
        {children}
      </span>
    );
  }
  // underline
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "2px 4px",
        borderBottom: `4px solid ${style.color}`,
        borderRadius: 0,
      }}
    >
      {children}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  HeadlineCard                                                       */
/*                                                                     */
/*  Big-text intro beat for the story hook. Like KeyStatement, it:   */
/*   - sits on a TRANSPARENT AbsoluteFill (PersistentBackground is  */
/*     the canvas),                                                   */
/*   - draws a white card with shadow + border + top accent bar,     */
/*   - sizes the headline with fitText (longest word fits the card), */
/*   - cycles Highlight / Circle / Underline on emphasisWords,       */
/*   - holds idle state after ~30–40% of the beat (no exit),        */
/*   - relies on SceneTransition (mounted by the orchestrator) for   */
/*     the entrance fade + the cross-fade to the next beat.         */
/* ------------------------------------------------------------------ */

export const HeadlineCard: React.FC<HeadlineCardProps> = ({
  text,
  emphasisWords,
  accentColor = "#e86c00",
  accentColorLight = "#f97316",
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } =
    useVideoConfig();

  // The orchestrator passes durationInFrames via <BeatComponent {...}
  // durationInFrames={beat.durationInFrames} />. KeyStatement's API
  // names it `propsDurationInFrames` and falls back to the composition
  // duration; we do the same.
  const durationInFrames = videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — completes by ~40%, then holds.
  // No exit animation. SceneTransition (mounted by the
  // orchestrator) owns the entrance fade and the cross-fade.
  // ============================================
  const wordDuration = Math.max(8, Math.round(durationInFrames * 0.08));
  const wordStagger = Math.max(2, Math.round(durationInFrames * 0.03));
  const textStartDelay = Math.max(2, Math.round(durationInFrames * 0.05));
  const words = text.split(" ");
  const totalWords = words.length;
  const textEndFrame =
    textStartDelay + (totalWords - 1) * wordStagger + wordDuration;
  const sliderStart = textEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.45);

  // Card entrance — quick fade + spring pop.
  const cardEntranceDuration = Math.max(12, Math.round(durationInFrames * 0.07));

  const isIdle = frame > textEndFrame;

  // Mark which words are emphasised.
  const emphasisSet = new Set(
    emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")),
  );

  // Cycle the annotation shape per emphasised word.
  let emphasisRunIndex = 0;
  const wordAnnotations = words.map((word) => {
    const clean = word.toLowerCase().replace(/[.,!?;:]$/, "");
    if (!emphasisSet.has(clean)) return null;
    const entry = ANNOTATION_CYCLE[emphasisRunIndex % ANNOTATION_CYCLE.length];
    emphasisRunIndex += 1;
    return entry;
  });

  // Card idle bounce + subtle 3D tilt (matches KeyStatement).
  const cardBounceFrequency = 0.08;
  const cardBounceAmplitude = 6;
  const cardBounceOffset = isIdle
    ? Math.sin(frame * cardBounceFrequency * Math.PI * 2) * cardBounceAmplitude
    : 0;
  const cardTiltDeg = isIdle ? Math.sin(frame * 0.05) * 2 : 0;

  // Per-emphasis-word bounce (idle loop).
  const bounceFrequency = 0.25;
  const bounceAmplitude = 8;

  // Glow pulse (idle).
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Responsive sizing.
  const padding = Math.max(60, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(36, width * 0.044);
  const cardBorderRadius = Math.max(28, width * 0.03);
  const containerMinHeight = Math.max(320, height * 0.28);
  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Auto-fit the headline: longest word must fit the card's text area.
  const textAreaWidth = availableWidth - 2 * cardPadding;
  const longestWord = words.reduce(
    (longest, current) => (current.length > longest.length ? current : longest),
    "",
  );
  const fittedSize = fitText({
    text: longestWord,
    withinWidth: textAreaWidth,
    fontFamily,
    fontWeight: "700",
  }).fontSize;
  const baseFontSize = Math.min(Math.max(56, width * 0.055), fittedSize * 0.85);
  const emphasisFontSize = Math.min(
    Math.max(68, width * 0.066),
    fittedSize,
  );

  // Shimmer timing (idle).
  const shimmerSpeed = 25;
  const shimmerStart = textEndFrame;
  const getShimmerTop = (start: number) => {
    if (frame < start) return "-100%";
    const elapsedSeconds = (frame - start) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };
  const getShimmerOpacity = (start: number) => (frame < start ? 0 : 1);

  /* ------------------------------ decorations ------------------------------ */

  const AccentDot: React.FC<{
    size?: number;
    color?: string;
    baseDelay?: number;
    opacity?: number;
    animate?: boolean;
  }> = ({
    size = 8,
    color = accentColor,
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
              ? `drop-shadow(0 0 ${
                  4 + 2 * Math.sin(frame * 0.1 + baseDelay)
                }px ${ACCENT_GLOW})`
              : "none",
        }}
      />
    );
  };

  const DecorativeLine: React.FC<{
    width?: number;
    height?: number;
    color?: string;
    opacity?: number;
    animate?: boolean;
  }> = ({
    width: lineWidth = 60,
    height: lineHeight = 2,
    color = accentColor,
    opacity: lineOpacity = 1,
    animate = false,
  }) => {
    const pulse = animate && isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.08) : lineOpacity;
    const glow =
      animate && isIdle
        ? `drop-shadow(0 0 ${
            4 + 2 * Math.sin(frame * 0.1)
          }px ${ACCENT_GLOW})`
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

  /* -------------------------------- render -------------------------------- */

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        // TRANSPARENT — PersistentBackground provides the canvas.
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
        <div
          style={{
            position: "relative",
            width: availableWidth,
            perspective: 1200,
          }}
        >
          {/* Slider border — pure CSS, matches KeyStatement. */}
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
                },
              ),
              filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
            }}
          />

          {/* White card with shadow + border + top accent bar. */}
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
              translate: `0px ${cardBounceOffset}px`,
              rotate: `x ${cardTiltDeg}deg`,
            }}
          >
            {/* Top accent bar (curved corners). */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${accentColor}, ${accentColorLight})`,
                borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
              }}
            />

            {/* Subtle diagonal pattern. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: cardBorderRadius,
                opacity: 0.03,
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  ${accentColor} 0,
                  ${accentColor} 1px,
                  transparent 1px,
                  transparent 20px
                )`,
                pointerEvents: "none",
              }}
            />

            {/* Radial gradient overlay for depth. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: cardBorderRadius,
                background:
                  "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.02) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Glow behind the card. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
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

            {/* Decorative dots at the top. */}
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

            {/* Headline. */}
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
                  const cleanWord = word
                    .toLowerCase()
                    .replace(/[.,!?;:]$/, "");
                  const isEmphasized = emphasisSet.has(cleanWord);
                  const annotation = wordAnnotations[i];

                  const wordStartFrame = textStartDelay + i * wordStagger;
                  const wordEndFrame = wordStartFrame + wordDuration;

                  const bounceOffset =
                    isIdle && isEmphasized
                      ? Math.sin(frame * bounceFrequency * Math.PI * 2) *
                        bounceAmplitude
                      : 0;
                  const idleScalePulse =
                    isIdle && isEmphasized
                      ? 1 + 0.04 * Math.sin(frame * 0.12 + i)
                      : 1;
                  const emphasisFloat =
                    isIdle && isEmphasized ? 3 * Math.sin(frame * 0.08 + i) : 0;

                  const wordFilter = [
                    `blur(${interpolate(
                      frame,
                      [wordStartFrame, wordEndFrame],
                      [8, 0],
                      {
                        easing: easeOutExpo,
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    )}px)`,
                    ...(isIdle && isEmphasized
                      ? [
                          `drop-shadow(0 0 ${
                            8 + 4 * Math.sin(frame * 0.15 + i)
                          }px ${ACCENT_GLOW})`,
                          `drop-shadow(0 0 ${
                            16 + 8 * Math.sin(frame * 0.1 + i)
                          }px ${ACCENT_GLOW})`,
                        ]
                      : []),
                  ].join(" ");

                  const wordContent = (
                    <span
                      style={{
                        display: "inline-block",
                        opacity: interpolate(
                          frame,
                          [wordStartFrame, wordEndFrame],
                          [0, 1],
                          {
                            easing: easeOutExpo,
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                          },
                        ),
                        translate: `0px ${
                          interpolate(
                            frame,
                            [wordStartFrame, wordEndFrame],
                            [40, 0],
                            {
                              easing: easeOutExpo,
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                            },
                          ) +
                          bounceOffset +
                          emphasisFloat
                        }px`,
                        scale:
                          interpolate(
                            frame,
                            [wordStartFrame, wordEndFrame],
                            [0.7, 1],
                            {
                              easing: easeOutExpo,
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                              output: "perceptual-scale",
                            },
                          ) * idleScalePulse,
                        rotate: `${interpolate(
                          frame,
                          [wordStartFrame, wordEndFrame],
                          [-5, 0],
                          {
                            easing: easeOutExpo,
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                          },
                        )}deg`,
                        transformOrigin: "center bottom",
                        fontSize: isEmphasized ? emphasisFontSize : baseFontSize,
                        fontWeight: isEmphasized ? 700 : 500,
                        fontFamily,
                        lineHeight: 1.3,
                        margin: "0 0.04em",
                        ...(isEmphasized
                          ? {
                              backgroundImage: `linear-gradient(120deg, ${accentColor}, ${accentColorLight})`,
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

                  if (isEmphasized && annotation) {
                    return (
                      <span key={i} style={{ display: "inline-block" }}>
                        {renderAnnotation(annotation, wordContent)}
                      </span>
                    );
                  }
                  return <span key={i}>{wordContent}</span>;
                })}
              </div>

              {/* Separator. */}
              <DecorativeLine
                width={80}
                height={3}
                color={accentColor}
                opacity={isIdle ? 0.7 : 0.4}
                animate={true}
              />

              {/* Accent dots below text. */}
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

            {/* Shimmer overlay. */}
            <div
              style={{
                position: "absolute",
                top: getShimmerTop(shimmerStart),
                left: 0,
                width: "100%",
                height: "18%",
                background: `linear-gradient(180deg, transparent, ${accentColor}33, transparent)`,
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
