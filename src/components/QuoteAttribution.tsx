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

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface QuoteAttributionProps {
  quote: string;
  attribution: string;
  emphasisWords?: string[];
  durationInFrames?: number;
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

const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_COLOR_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

export const QuoteAttribution: React.FC<QuoteAttributionProps> = ({
  quote,
  attribution,
  emphasisWords = [],
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // 30-40% entrance rule
  const quoteDuration = Math.round(durationInFrames * 0.20);
  const attrStart = quoteDuration + Math.round(durationInFrames * 0.04);
  const attrDuration = Math.round(durationInFrames * 0.08);
  const attrEnd = attrStart + attrDuration;
  const entranceEndFrame = attrEnd;
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const quoteProgress = interpolate(frame, [0, quoteDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const attrProgress = interpolate(frame, [attrStart, attrEnd], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sliderProgress = interpolate(
    frame,
    [sliderStart, sliderStart + sliderDuration],
    [0, 1],
    { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const cardEntranceDuration = Math.max(12, Math.round(durationInFrames * 0.07));

  const isIdle = frame > entranceEndFrame;
  const cardBounceOffset = isIdle
    ? Math.sin(frame * 0.08 * Math.PI * 2) * 6
    : 0;
  const cardTiltDeg = isIdle ? Math.sin(frame * 0.05) * 2 : 0;
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(56, width * 0.06);
  const cardBorderRadius = Math.max(32, width * 0.03);

  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const quoteTextAreaWidth = availableWidth - 2 * cardPadding;
  const longestWord = quote
    .split(" ")
    .reduce((a, b) => (a.length >= b.length ? a : b), "");
  const quoteFit = fitText({
    text: longestWord,
    withinWidth: quoteTextAreaWidth,
    fontFamily,
    fontWeight: "700",
  });
  const quoteFontSize = Math.min(
    Math.max(48, width * 0.045),
    quoteFit.fontSize,
  );
  const attrFontSize = Math.max(22, width * 0.022);
  const markFontSize = Math.max(80, width * 0.075);

  const shimmerStart = entranceEndFrame;
  const shimmerSpeed = 25;
  const getShimmerTop = (s: number) => {
    if (frame < s) return "-100%";
    const elapsedSeconds = (frame - s) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };
  const getShimmerOpacity = (s: number) => (frame < s ? 0 : 1);

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

  // Emphasis rendering for the quote
  const emphasisSet = new Set(
    emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")),
  );
  let runIndex = 0;
  const quoteWords = quote.split(" ");
  const wordAnnotations = quoteWords.map((w) => {
    const clean = w.toLowerCase().replace(/[.,!?;:]$/, "");
    if (!emphasisSet.has(clean)) return null;
    const entry = ANNOTATION_CYCLE[runIndex % ANNOTATION_CYCLE.length];
    runIndex += 1;
    return entry;
  });

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
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              padding: cardPadding,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
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
              <AccentDot size={6} baseDelay={0} />
              <AccentDot size={8} baseDelay={0.5} />
              <AccentDot size={6} baseDelay={1} />
            </div>

            {/* Content */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
              }}
            >
              {/* Opening quote mark */}
              <div
                style={{
                  fontSize: markFontSize,
                  fontWeight: 700,
                  fontFamily: "Georgia, serif",
                  color: ACCENT_COLOR,
                  lineHeight: 1,
                  opacity: quoteProgress,
                  scale: interpolate(quoteProgress, [0, 1], [0.3, 1], {
                    easing: easeOutExpo,
                    output: "perceptual-scale",
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transformOrigin: "center bottom",
                  filter: isIdle
                    ? `drop-shadow(0 0 ${8 + 4 * Math.sin(frame * 0.1)}px ${ACCENT_GLOW})`
                    : "none",
                }}
              >
                &ldquo;
              </div>

              {/* Quote text (with optional emphasis) */}
              <div
                style={{
                  fontSize: quoteFontSize,
                  fontWeight: 700,
                  fontFamily,
                  color: DARK_TEXT,
                  lineHeight: 1.3,
                  letterSpacing: -1.5,
                  textAlign: "center",
                  maxWidth: "100%",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  opacity: quoteProgress,
                  translate: `0px ${interpolate(quoteProgress, [0, 1], [20, 0])}px`,
                }}
              >
                {quoteWords.map((word, i) => {
                  const annotation = wordAnnotations[i];
                  const isEmphasized = !!annotation;
                  const wordStart = i * 2;
                  const wordEnd = wordStart + 5;
                  const wordContent = (
                    <span
                      style={{
                        color: isEmphasized ? ACCENT_COLOR : DARK_TEXT,
                      }}
                    >
                      {word}
                      {i < quoteWords.length - 1 ? " " : ""}
                    </span>
                  );
                  if (isEmphasized && annotation) {
                    const C = annotation.Component;
                    return (
                      <C
                        key={i}
                        color={annotation.color}
                        strokeWidth={3}
                        padding={6}
                        progress={interpolate(
                          frame,
                          [wordStart, wordEnd],
                          [0, 1],
                          {
                            easing: easeOutExpo,
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                          },
                        )}
                      >
                        {wordContent}
                      </C>
                    );
                  }
                  return <span key={i}>{wordContent}</span>;
                })}
              </div>

              {/* Closing quote mark */}
              <div
                style={{
                  fontSize: markFontSize,
                  fontWeight: 700,
                  fontFamily: "Georgia, serif",
                  color: ACCENT_COLOR,
                  lineHeight: 1,
                  opacity: quoteProgress,
                  scale: interpolate(quoteProgress, [0, 1], [0.3, 1], {
                    easing: easeOutExpo,
                    output: "perceptual-scale",
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transformOrigin: "center top",
                  filter: isIdle
                    ? `drop-shadow(0 0 ${8 + 4 * Math.sin(frame * 0.1)}px ${ACCENT_GLOW})`
                    : "none",
                }}
              >
                &rdquo;
              </div>

              {/* Separator */}
              <div
                style={{
                  width: 80,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)`,
                  borderRadius: 1,
                  opacity: attrProgress,
                  scaleX: attrProgress,
                  transformOrigin: "center",
                }}
              />

              {/* Attribution */}
              <div
                style={{
                  fontSize: attrFontSize,
                  fontWeight: 500,
                  fontFamily,
                  color: MEDIUM_TEXT,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  opacity: attrProgress,
                  translate: `0px ${interpolate(attrProgress, [0, 1], [15, 0])}px`,
                }}
              >
                &mdash; {attribution}
              </div>

              <div style={{ display: "flex", gap: 10, pointerEvents: "none", marginTop: 4 }}>
                <AccentDot size={5} baseDelay={0.2} />
                <AccentDot size={7} baseDelay={0.7} />
                <AccentDot size={5} baseDelay={1.2} />
              </div>
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

export const QuoteAttributionTestComposition: React.FC = () => (
  <Composition
    id="QuoteAttributionTest"
    component={QuoteAttribution}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      quote: "The best way to predict the future is to invent it.",
      attribution: "Alan Kay",
    }}
  />
);
