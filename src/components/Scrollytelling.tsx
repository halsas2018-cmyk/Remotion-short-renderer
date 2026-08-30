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

interface ScrollytellingProps {
  title: string;
  body: string;
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

export const Scrollytelling: React.FC<ScrollytellingProps> = ({
  title,
  body,
  emphasisWords = [],
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // 30-40% entrance rule
  const titleDuration = Math.round(durationInFrames * 0.10);
  const bodyStart = Math.round(durationInFrames * 0.12);
  const bodyEnd = bodyStart + Math.round(durationInFrames * 0.22);
  const entranceEndFrame = bodyEnd;
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const titleProgress = interpolate(frame, [0, titleDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bodyProgress = interpolate(frame, [bodyStart, bodyEnd], [0, 1], {
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

  // Body content sizing
  const bodyFontSize = Math.max(32, width * 0.030);
  const bodyLineHeight = bodyFontSize * 1.5;
  const bodyContainerHeight = Math.min(800, height * 0.5);
  const bodyLines = body.split("\n").filter((l) => l.trim().length > 0);
  const totalBodyHeight = bodyLines.length * bodyLineHeight;
  const scrollDistance = Math.max(0, totalBodyHeight - bodyContainerHeight);
  // Scroll linearly across the idle phase. Hold the final position for the
  // last 30 frames of the beat so the bottom of the body is visible.
  const scrollEnd = Math.max(sliderStart + 1, durationInFrames - 30);
  const scrollProgress = interpolate(
    frame,
    [sliderStart, scrollEnd],
    [0, 1],
    { easing: Easing.linear, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bodyTranslateY = -scrollDistance * scrollProgress;

  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(48, width * 0.044);
  const cardBorderRadius = Math.max(32, width * 0.03);
  const cardHeight = bodyContainerHeight + bodyFontSize * 3 + cardPadding * 2 + 60;

  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const titleFit = fitText({
    text: title,
    withinWidth: availableWidth - 2 * cardPadding,
    fontFamily,
    fontWeight: "700",
  });
  const titleFontSize = Math.min(Math.max(48, width * 0.045), titleFit.fontSize);

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

  // Emphasis words
  const emphasisSet = new Set(
    emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")),
  );
  let runIndex = 0;
  const renderBodyWord = (word: string, key: number) => {
    const clean = word.toLowerCase().replace(/[.,!?;:]$/, "");
    const isEmphasized = emphasisSet.has(clean);
    const annotation = isEmphasized
      ? ANNOTATION_CYCLE[runIndex++ % ANNOTATION_CYCLE.length]
      : null;
    const wordContent = (
      <span
        style={{
          color: isEmphasized ? ACCENT_COLOR : DARK_TEXT,
          fontWeight: isEmphasized ? 700 : 500,
        }}
      >
        {word}
      </span>
    );
    if (annotation) {
      const C = annotation.Component;
      return (
        <C
          key={key}
          color={annotation.color}
          strokeWidth={3}
          padding={6}
          progress={1}
        >
          {wordContent}
        </C>
      );
    }
    return <span key={key}>{wordContent}</span>;
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
              minHeight: cardHeight,
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
              {/* Title (fixed) */}
              <div
                style={{
                  fontSize: titleFontSize,
                  fontWeight: 700,
                  fontFamily,
                  color: DARK_TEXT,
                  lineHeight: 1.2,
                  letterSpacing: -1.5,
                  textAlign: "center",
                  wordBreak: "break-word",
                  maxWidth: "100%",
                  opacity: titleProgress,
                  translate: `0px ${interpolate(titleProgress, [0, 1], [20, 0])}px`,
                }}
              >
                {title}
              </div>

              {/* Separator */}
              <div
                style={{
                  width: 80,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)`,
                  borderRadius: 1,
                  opacity: titleProgress,
                  scaleX: titleProgress,
                }}
              />

              {/* Body (scrolling) */}
              <div
                style={{
                  width: "100%",
                  height: bodyContainerHeight,
                  position: "relative",
                  overflow: "hidden",
                  opacity: bodyProgress,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${bodyTranslateY}px)`,
                    display: "flex",
                    flexDirection: "column",
                    gap: bodyLineHeight * 0.5,
                  }}
                >
                  {bodyLines.map((line, i) => {
                    const words = line.split(" ");
                    return (
                      <p
                        key={i}
                        style={{
                          margin: 0,
                          fontSize: bodyFontSize,
                          fontWeight: 500,
                          fontFamily,
                          color: DARK_TEXT,
                          lineHeight: 1.5,
                          letterSpacing: -0.5,
                          textAlign: "left",
                        }}
                      >
                        {words.map((w, wi) => renderBodyWord(w, i * 1000 + wi))}
                      </p>
                    );
                  })}
                </div>
                {/* Top fade */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    background: "linear-gradient(180deg, white 0%, transparent 100%)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
                {/* Bottom fade */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    background: "linear-gradient(0deg, white 0%, transparent 100%)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, pointerEvents: "none" }}>
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

export const ScrollytellingTestComposition: React.FC = () => (
  <Composition
    id="ScrollytellingTest"
    component={Scrollytelling}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      title: "Why AI Chips Matter",
      body: "The semiconductor shortage reshaped the entire tech industry.\nFoundries raced to add capacity.\nDesigners had to optimize for older nodes.\nCloud providers locked in multi-year supply contracts.\n\nThe result: a new normal where chip supply is a strategic asset.\n\nCompanies that secured early access pulled ahead.\nThose that waited paid premiums and shipped late.\nThe gap between the haves and have-nots widened.",
      emphasisWords: ["shortage", "strategic", "premiums"],
    }}
  />
);
