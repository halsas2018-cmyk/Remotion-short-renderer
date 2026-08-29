import React from "react";
import {
  AbsoluteFill,
  Composition,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { Highlight, Circle, Underline } from "@remotion/rough-notation";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { fitText } from "@remotion/layout-utils";

/* ------------------------------------------------------------------ */
/*  Google Font — type-safe, blocks rendering until the font is      */
/*  ready. Same setup as KeyStatement so the two components sit in   */
/*  the same visual family.                                          */
/* ------------------------------------------------------------------ */

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface HeadlineCardProps {
  text: string;
  emphasisWords: string[];
  durationInFrames?: number; // Optional override; defaults to composition duration
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
const DARK_TEXT = "#ffffff";
const CARD_BORDER = "rgba(255, 255, 255, 0.12)";

/* ------------------------------------------------------------------ */
/*  Three emphasis annotation shapes, cycled per emphasised word.    */
/*  Same pattern KeyStatement uses: Highlight → Circle → Underline  */
/*  from `@remotion/rough-notation` (the React-wrapped variant with  */
/*  a `progress` prop that the upstream `rough-notation` package     */
/*  does not export).                                                */
/* ------------------------------------------------------------------ */

const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.35)" },
  { Component: Circle, color: ACCENT_COLOR_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

export const HeadlineCard: React.FC<HeadlineCardProps> = ({
  text,
  emphasisWords,
  durationInFrames: propsDurationInFrames,
  wordDurPct = 0.08,
  wordStaggerPct = 0.03,
  textStartDelayPct = 0.05,
  sliderDurPct = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  // Use prop override if provided, otherwise fall back to composition duration
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  /* ================================================================ */
  /*  INTERNAL TIMELINE — completes by ~40%, then holds.              */
  /*  No exit animation. SceneTransition (mounted by the             */
  /*  orchestrator's BeatContent wrapper) owns the entrance fade    */
  /*  and the cross-fade to the next beat.                           */
  /* ================================================================ */
  const wordDuration = Math.max(8, Math.round(durationInFrames * wordDurPct));
  const wordStagger = Math.max(2, Math.round(durationInFrames * wordStaggerPct));
  const textStartDelay = Math.max(2, Math.round(durationInFrames * textStartDelayPct));
  const words = text.split(" ");
  const totalWords = words.length;
  const textEndFrame =
    textStartDelay + (totalWords - 1) * wordStagger + wordDuration;

  // Card entrance — quick fade + spring pop at the very start
  const cardEntranceDuration = Math.max(12, Math.round(durationInFrames * 0.07));

  // Idle state — everything time-based from here on
  const isIdle = frame > textEndFrame;

  // Mark which words are emphasised
  const emphasisSet = new Set(
    emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")),
  );

  // Assign an annotation style to each emphasized word (cycles Highlight → Circle → Underline)
  let emphasisRunIndex = 0;
  const wordAnnotations = words.map((word) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, "");
    if (!emphasisSet.has(cleanWord)) return null;
    const entry = ANNOTATION_CYCLE[emphasisRunIndex % ANNOTATION_CYCLE.length];
    emphasisRunIndex += 1;
    return entry;
  });

  // Per-emphasis-word bounce (idle loop)
  const bounceFrequency = 0.25;
  const bounceAmplitude = 8;

  // Glow pulse (idle)
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Responsive sizing — portrait 1080×1920 hard-coded for Shorts.
  const padding = Math.max(60, width * 0.11);
  const availableWidth = width - 2 * padding;

  // Auto-fit the headline: longest word must fit the card's text area.
  const longestWord = words.reduce(
    (longest, current) => (current.length > longest.length ? current : longest),
    "",
  );
  const fittedSize = fitText({
    text: longestWord,
    withinWidth: availableWidth,
    fontFamily,
    fontWeight: "700",
  }).fontSize;
  const baseFontSize = Math.min(Math.max(56, width * 0.055), fittedSize * 0.85);
  const emphasisFontSize = Math.min(Math.max(68, width * 0.066), fittedSize);

  /* ------------------------------ decorations ------------------------------ */

  const AccentDot: React.FC<{
    size?: number;
    color?: string;
    baseDelay?: number;
    opacity?: number;
    animate?: boolean;
  }> = ({
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
    color = ACCENT_COLOR,
    opacity: lineOpacity = 1,
    animate = false,
  }) => {
    const pulse =
      animate && isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.08) : lineOpacity;
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

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        // TRANSPARENT — PersistentBackground provides the canvas.
        // No opaque card, no white background, no shadow.
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
          {/* Glow behind the headline. */}
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
                borderRadius: 999,
                background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.35) 0%, transparent 70%)`,
                opacity: glowOpacity,
                filter: `blur(60px)`,
                scale: glowPulse,
              }}
            />
          </div>

          {/* Decorative accent dots at top. */}
          <div
            style={{
              position: "absolute",
              top: -16,
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

          {/* Headline — no card chrome, sits on PersistentBackground. */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              opacity: interpolate(
                frame,
                [0, cardEntranceDuration],
                [0, 1],
                {
                  easing: easeOut,
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              ),
              scale: interpolate(
                frame,
                [0, cardEntranceDuration],
                [0.92, 1],
                {
                  easing: Easing.spring({ damping: 200 }),
                  output: "perceptual-scale",
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              ),
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
                textShadow: `0 4px 24px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)`,
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

                // Word entrance window.
                const wordStartFrame = textStartDelay + i * wordStagger;
                const wordEndFrame = wordStartFrame + wordDuration;

                // Idle animations for emphasized words.
                const bounceOffset =
                  isIdle && isEmphasized
                    ? Math.sin(frame * bounceFrequency * Math.PI * 2) * bounceAmplitude
                    : 0;
                const idleScalePulse =
                  isIdle && isEmphasized ? 1 + 0.04 * Math.sin(frame * 0.12 + i) : 1;
                const emphasisFloat =
                  isIdle && isEmphasized ? 3 * Math.sin(frame * 0.08 + i) : 0;

                // Filter chain: entrance blur (+ idle glow for emphasized words).
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
                        },
                      )}
                    >
                      {wordContent}
                    </AnnotationComponent>
                  );
                }

                return <span key={i}>{wordContent}</span>;
              })}
            </div>

            {/* Decorative separator line. */}
            <DecorativeLine
              width={80}
              height={3}
              color={ACCENT_COLOR}
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
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const HeadlineCardTestComposition: React.FC = () => (
  <Composition
    id="HeadlineCardTest"
    component={HeadlineCard}
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
