import React, { useMemo } from "react";
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
import { fitText, measureText } from "@remotion/layout-utils";
import { useIdleMotion } from "../lib/idleMotion";
import { DropCap, TimelineRail, Masthead } from "../lib/textCards";

/* ------------------------------------------------------------------ */
/*  Scrollytelling — multi-line article style (Horizon 2.6 follow-up) */
/*                                                                     */
/*  Renders like a magazine article card:                              */
/*    ┌────────────────────────────────────────┐                       */
/*    │  • THE SIGNAL FEED  (masthead)         │                       */
/*    │  ─────                                 │  (accent rule)         */
/*    │  Why AI Chips Matter  (title)          │                       */
/*    │  ─────                                 │  (separator)           */
/*    │  [drop-cap]  Chip supply is now a      │                       */
/*    │             strategic asset, not a     │                       */
/*    │             commodity.                 │                       */
/*    │  ┃ dot   ← timeline rail on left,      │                       */
/*    │  ┃ dot     one dot per body word       │                       */
/*    │  ┃ dot                                │                       */
/*    └────────────────────────────────────────┘                       */
/*                                                                     */
/*  Body uses Georgia (serif) at 32–42px, left-aligned, with a drop     */
/*  cap on the first letter. A vertical orange rail runs down the     */
/*  left side of the body with one dot per body word; dots light up    */
/*  as the words enter. The masthead sits at the top in small caps.   */
/* ------------------------------------------------------------------ */

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface ScrollytellingProps {
  title: string;
  body: string;
  emphasisWords?: string[];
  durationInFrames?: number;
  /** Override the masthead label. Defaults to "The Signal Feed". */
  mastheadLabel?: string;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_COLOR_LIGHT = "#f97316";
const ACCENT_GLOW = "rgba(232, 108, 0, 0.4)";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";
const SERIF = "Georgia, serif";

const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_COLOR_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

export const Scrollytelling: React.FC<ScrollytellingProps> = ({
  title,
  body,
  emphasisWords = [],
  durationInFrames: propsDurationInFrames,
  mastheadLabel = "The Signal Feed",
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // -------------------------------------------------------------- //
  //  Timeline                                                       //
  //  masthead:  0 .. 12%   (fade in)                                //
  //  title:     8% .. 22%  (stagger in, then underline draws)       //
  //  body:      22% .. 50% (per-word fade + slide-up + dot fill)    //
  //  rail+dots: per body word                                      //
  //  idle:      50% .. end                                        //
  // -------------------------------------------------------------- //
  const mastheadStart = Math.round(durationInFrames * 0.02);
  const mastheadDuration = Math.round(durationInFrames * 0.10);
  const titleStart = Math.round(durationInFrames * 0.08);
  const titleDuration = Math.round(durationInFrames * 0.10);
  const bodyStart = Math.round(durationInFrames * 0.22);
  const bodyEnd = Math.round(durationInFrames * 0.50);
  const sliderStart = bodyEnd;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const mastheadProgress = interpolate(
    frame,
    [mastheadStart, mastheadStart + mastheadDuration],
    [0, 1],
    { easing: easeOutExpo, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const titleProgress = interpolate(
    frame,
    [titleStart, titleStart + titleDuration],
    [0, 1],
    { easing: easeOutExpo, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Card entrance + idle
  const cardEntranceDuration = Math.max(12, Math.round(durationInFrames * 0.07));
  const isIdle = frame > bodyEnd;
  const idle = useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false });
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Sizing
  const padding = Math.max(64, width * 0.09);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(56, width * 0.05);
  const cardBorderRadius = Math.max(28, width * 0.03);

  // Article gutter on the left reserves space for the timeline rail.
  const gutter = 64;
  const textAreaWidth = availableWidth - 2 * cardPadding - gutter;
  const textMaxWidth = textAreaWidth - 24; // small inner padding

  // Title font size — fit to width, max ~96px, min 56px.
  const titleMaxFontSize = Math.max(96, width * 0.085);
  const titleMinFontSize = 56;
  const titleSize = useMemo(() => {
    const fitted = fitText({
      text: title,
      withinWidth: textMaxWidth,
      fontFamily,
      fontWeight: "700",
      maxFontSize: titleMaxFontSize,
      minFontSize: titleMinFontSize,
    });
    let size = Math.max(titleMinFontSize, Math.min(titleMaxFontSize, fitted.fontSize));
    while (size > titleMinFontSize) {
      const { width: w } = measureText({
        text: title,
        fontFamily,
        fontSize: size,
        fontWeight: "700",
      });
      if (w <= textMaxWidth) break;
      size = Math.max(titleMinFontSize, size - 2);
    }
    return size;
  }, [title, textMaxWidth, titleMaxFontSize, titleMinFontSize]);

  // Body font size — Georgia, 28..42px, smaller than title.
  const bodyMaxFontSize = Math.max(42, width * 0.039);
  const bodyMinFontSize = 28;

  // Word list (we render the body word-by-word for the timeline rail
  // and the drop cap to work).
  const bodyWords = useMemo(
    () => body.split(/\s+/).filter(Boolean),
    [body],
  );
  const totalBodyWords = bodyWords.length;

  // For the drop cap, isolate the first letter of the first word.
  const firstLetter = bodyWords[0]?.charAt(0) ?? "";
  const restOfFirstWord = bodyWords[0]?.slice(1) ?? "";

  // Emphasis set
  const emphasisSet = new Set(
    emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")),
  );

  // Body entrance: each word gets a per-word fade + slide-up window.
  // Compress into the [bodyStart, bodyEnd] interval.
  const bodyWordDuration = Math.max(
    6,
    Math.round((bodyEnd - bodyStart) / Math.max(totalBodyWords, 1) * 0.7),
  );
  const bodyWordStagger = Math.max(
    2,
    Math.round((bodyEnd - bodyStart) / Math.max(totalBodyWords, 1)),
  );

  // Card content height — auto-derived from the number of body words.
  // Assume ~6 words per line at the body font size.
  const estimatedLines = Math.max(
    3,
    Math.ceil(totalBodyWords / Math.max(1, Math.floor(textMaxWidth / (bodyMaxFontSize * 0.55)))),
  );
  const cardMinHeight = Math.max(560, height * 0.5);
  const bodyBlockHeight = bodyMaxFontSize * 1.5 * estimatedLines + 40;

  // Slider
  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Shimmer
  const shimmerStart = bodyEnd;
  const shimmerSpeed = 25;
  const getShimmerTop = (s: number) => {
    if (frame < s) return "-100%";
    const elapsedSeconds = (frame - s) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };
  const getShimmerOpacity = (s: number) => (frame < s ? 0 : 1);

  // Per-word emphasis annotation assignment (cycle Highlight → Circle → Underline)
  let runIndex = 0;
  const wordAnnotations = bodyWords.map((word) => {
    const clean = word.toLowerCase().replace(/[.,!?;:]$/, "");
    if (!emphasisSet.has(clean)) return null;
    const entry = ANNOTATION_CYCLE[runIndex % ANNOTATION_CYCLE.length];
    runIndex += 1;
    return entry;
  });

  // Compute per-word entrance window and whether the word is "filled" (timeline dot).
  const getWordStartFrame = (idx: number) =>
    bodyStart + idx * bodyWordStagger;
  const getWordEndFrame = (idx: number) =>
    getWordStartFrame(idx) + bodyWordDuration;

  // Count words that are at least 60% revealed — that's how many
  // timeline dots should be solid.
  const filledDotCount = bodyWords.reduce((acc, _w, i) => {
    const endFrame = getWordEndFrame(i);
    if (frame >= endFrame) return acc + 1;
    return acc;
  }, 0);

  const AccentDot = ({ size = 8, baseDelay = 0 }: { size?: number; baseDelay?: number }) => {
    const pulse = isIdle ? 1 + 0.3 * Math.sin(frame * 0.2 + baseDelay) : 1;
    const float = isIdle ? 4 * Math.sin(frame * 0.15 + baseDelay) : 0;
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: ACCENT_COLOR,
          opacity: pulse,
          translate: `0px ${float}px`,
          flexShrink: 0,
          filter: isIdle
            ? `drop-shadow(0 0 ${4 + 2 * Math.sin(frame * 0.1 + baseDelay)}px ${ACCENT_GLOW})`
            : "none",
        }}
      />
    );
  };

  return (
    <AbsoluteFill style={{ width, height, backgroundColor: "transparent" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          translate: "0px -50%",
          width: availableWidth,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: availableWidth,
            perspective: 1200,
          }}
        >
          {/* Slider */}
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

          {/* Card */}
          <div
            style={{
              position: "relative",
              minHeight: cardMinHeight,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              padding: cardPadding,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "flex-start",
              gap: 28,
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
              translate: `0px ${idle.translateY}px`,
              rotate: `x ${idle.rotateX}deg`,
            }}
          >
            {/* Top accent bar */}
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

            {/* Diagonal pattern overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: cardBorderRadius,
                opacity: 0.03,
                backgroundImage: `repeating-linear-gradient(45deg, ${ACCENT_COLOR} 0, ${ACCENT_COLOR} 1px, transparent 1px, transparent 20px)`,
                pointerEvents: "none",
              }}
            />

            {/* Glow behind card */}
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

            {/* Masthead row — small caps label + accent dots */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: mastheadProgress,
                transform: `translateY(${interpolate(mastheadProgress, [0, 1], [-8, 0])}px)`,
              }}
            >
              <Masthead label={mastheadLabel} color={ACCENT_COLOR} />
              <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${ACCENT_COLOR}60, transparent)`, borderRadius: 1 }} />
              <div style={{ display: "flex", gap: 6 }}>
                <AccentDot size={4} baseDelay={0} />
                <AccentDot size={6} baseDelay={0.5} />
                <AccentDot size={4} baseDelay={1} />
              </div>
            </div>

            {/* Title (single line, fitText-resolved) */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                fontSize: titleSize,
                fontWeight: 700,
                fontFamily,
                color: DARK_TEXT,
                lineHeight: 1.1,
                letterSpacing: -2,
                opacity: titleProgress,
                transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
                textAlign: "left",
              }}
            >
              {title}
            </div>

            {/* Separator rule below title */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: titleProgress,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 3,
                  background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                  borderRadius: 2,
                  transform: `scaleX(${titleProgress})`,
                  transformOrigin: "left center",
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: DARK_TEXT,
                  opacity: 0.12,
                }}
              />
            </div>

            {/* Body block — multi-line article with drop cap + timeline rail */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                paddingLeft: gutter,
                minHeight: bodyBlockHeight,
              }}
            >
              {/* Timeline rail (vertical orange line + dots) */}
              <TimelineRail
                height={bodyBlockHeight}
                dotCount={totalBodyWords}
                filledCount={filledDotCount}
                color={ACCENT_COLOR}
                x={28}
              />

              {/* Drop cap on the first letter of the first word */}
              {firstLetter ? (
                <DropCap
                  letter={firstLetter}
                  size={Math.round(bodyMaxFontSize * 2.4)}
                  color={ACCENT_COLOR}
                  colorEnd={ACCENT_COLOR_LIGHT}
                  bodyFontSize={bodyMaxFontSize}
                  lineSpan={3}
                  lineHeight={1.55}
                  marginRight={14}
                  topOffset={4}
                  fontFamily={SERIF}
                />
              ) : null}

              {/* Word-by-word body rendering. The first word's first
                  letter is consumed by the drop cap; we render the
                  rest of the first word inline, then continue. */}
              {bodyWords.map((word, i) => {
                const isFirstWord = i === 0;
                const clean = word.toLowerCase().replace(/[.,!?;:]$/, "");
                const isEmphasized = emphasisSet.has(clean);
                const annotation = wordAnnotations[i];
                const startFrame = getWordStartFrame(i);
                const endFrame = getWordEndFrame(i);
                const wordProgress = interpolate(
                  frame,
                  [startFrame, endFrame],
                  [0, 1],
                  { easing: easeOutExpo, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );

                // Idle float for emphasized words
                const idleFloat = isIdle && isEmphasized ? 3 * Math.sin(frame * 0.08 + i) : 0;

                // For the first word, render only the REST of the word
                // (the first letter is the drop cap). If the first word
                // is a single letter, render nothing for it here.
                const text = isFirstWord ? restOfFirstWord : word;
                if (isFirstWord && !text) return null;

                const wordContent = (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: bodyMaxFontSize,
                      fontWeight: isEmphasized ? 700 : 500,
                      fontFamily: SERIF,
                      color: isEmphasized ? ACCENT_COLOR : DARK_TEXT,
                      lineHeight: 1.55,
                      letterSpacing: -0.3,
                      margin: "0 0.18em 0 0",
                      opacity: wordProgress,
                      translate: `0px ${interpolate(wordProgress, [0, 1], [16, 0]) + idleFloat}px`,
                      willChange: "transform, opacity",
                    }}
                  >
                    {text}
                  </span>
                );

                if (annotation) {
                  const C = annotation.Component;
                  return (
                    <C
                      key={i}
                      color={annotation.color}
                      strokeWidth={2}
                      padding={4}
                      progress={interpolate(
                        frame,
                        [startFrame, endFrame + 5],
                        [0, 1],
                        { easing: easeOutExpo, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                      )}
                    >
                      {wordContent}
                    </C>
                  );
                }
                return <span key={i}>{wordContent}</span>;
              })}
            </div>

            {/* Bottom accent dots */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                gap: 10,
                alignSelf: "center",
                opacity: titleProgress,
                pointerEvents: "none",
              }}
            >
              <AccentDot size={5} baseDelay={0.2} />
              <AccentDot size={7} baseDelay={0.7} />
              <AccentDot size={5} baseDelay={1.2} />
            </div>

            {/* Shimmer */}
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

export const ScrollytellingTestComposition: React.FC = () => (
  <Composition
    id="ScrollytellingTest"
    component={Scrollytelling}
    durationInFrames={240}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      title: "Why AI Chips Matter",
      body:
        "Chip supply is now a strategic asset, not a commodity. " +
        "Capital is following capacity, and capacity follows capital. " +
        "The chip itself is the new oil pipeline — and the producers hold the leverage.",
      emphasisWords: ["strategic", "capital", "chip", "leverage"],
    }}
  />
);
