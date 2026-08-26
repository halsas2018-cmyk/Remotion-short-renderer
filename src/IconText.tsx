import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  delayRender,
  continueRender,
  cancelRender,
} from "remotion";
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { Highlight, Circle, Underline } from "@remotion/rough-notation";
import { fitText, fillTextBox, measureText } from "@remotion/layout-utils";
import * as LucideIcons from "lucide-react";

interface IconTextProps {
  icon: string;
  text: string;
  emphasisWords?: string[];
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  iconDurPct?: number;
  textStartDelayPct?: number;
  wordDurPct?: number;
  wordStaggerPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

// Lottie icon map - maps icon names to files in public/icons/
const ICON_MAP: Record<string, string> = {
  warning: "warning.json",
  money: "money.json",
  chip: "chip.json",
  risk: "risk.json",
  contract: "contract.json",
  handshake: "handshake.json",
  brain: "brain.json",
  rocket: "rocket.json",
  growth: "growth.json",
  decline: "decline.json",
  clock: "clock.json",
  globe: "globe.json",
  lock: "lock.json",
  shield: "shield.json",
  lightbulb: "lightbulb.json",
  "trending-up": "trending-up.json",
  "trending-down": "trending-down.json",
};

// Lucide fallback icons for when Lottie files don't exist
const LUCIDE_FALLBACK_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  warning: LucideIcons.AlertTriangle,
  money: LucideIcons.DollarSign,
  chip: LucideIcons.Cpu,
  risk: LucideIcons.ShieldAlert,
  contract: LucideIcons.FileText,
  handshake: LucideIcons.Handshake,
  brain: LucideIcons.Brain,
  rocket: LucideIcons.Rocket,
  growth: LucideIcons.TrendingUp,
  decline: LucideIcons.TrendingDown,
  clock: LucideIcons.Clock,
  globe: LucideIcons.Globe,
  lock: LucideIcons.Lock,
  shield: LucideIcons.Shield,
  lightbulb: LucideIcons.Lightbulb,
  "trending-up": LucideIcons.TrendingUp,
  "trending-down": LucideIcons.TrendingDown,
};

const DefaultLucideIcon = LucideIcons.Info;

// Rough-notation variety — cycle annotation style per emphasized word (matches KeyStatement/PlainText)
const ANNOTATION_CYCLE = [
  { Component: Highlight, color: "rgba(232, 108, 0, 0.25)" },
  { Component: Circle, color: ACCENT_LIGHT },
  { Component: Underline, color: ACCENT_COLOR },
];

// Text line interface for wrapped text
interface TextLine {
  words: string[];
  startFrame: number;
  endFrame: number;
}

export const IconText: React.FC<IconTextProps> = ({
  icon,
  text,
  emphasisWords = [],
  durationInFrames: propsDurationInFrames,
  // CLAUDE.md Rule 1: Text cards must complete entrance by 50% of durationInFrames
  // IconText has both icon + text animation, target ~45-50%
  iconDurPct = 0.15,         // 15% - icon entrance
  textStartDelayPct = 0.05,  // 5% - delay before text starts
  wordDurPct = 0.08,         // 8% per word
  wordStaggerPct = 0.03,     // 3% stagger between words
  // CLAUDE.md Rule 3: Slider starts at textEndFrame, duration ~45%
  sliderDurPct = 0.45,       // 45% for slider
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // LOTTIE LOADING (from lottie.md pattern) with fallback
  // ============================================
  const iconFile = ICON_MAP[icon.toLowerCase()] || "info.json";
  const iconPath = `/icons/${iconFile}`;

  const [lottieHandle] = React.useState(() => delayRender(`Loading Lottie: ${iconFile}`));
  const [animationData, setAnimationData] = React.useState<LottieAnimationData | null>(null);
  const [lottieFailed, setLottieFailed] = React.useState(false);

  React.useEffect(() => {
    // Try to load Lottie file
    fetch(iconPath)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${iconPath}: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setAnimationData(json);
        continueRender(lottieHandle);
      })
      .catch((err) => {
        console.warn(`Lottie icon not found: ${iconPath}, using Lucide fallback`);
        setLottieFailed(true);
        continueRender(lottieHandle); // Continue render even if Lottie fails
      });
  }, [lottieHandle, iconPath]);

  // ============================================
  // RESPONSIVE SIZING & TEXT WRAPPING (using measuring-text.md)
  // ============================================
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(48, width * 0.044);
  const cardBorderRadius = Math.max(32, width * 0.03);

  // Container dimensions (for slider)
  const containerWidth = availableWidth;
  const containerHeight = 500; // Approximate card height (icon + text)
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Text content width (accounting for card padding)
  const textContentWidth = containerWidth - 2 * cardPadding;

  // Use fitText to find optimal font size that fits the text within the container
  // We measure the full text as a single block to get a baseline font size
  const fitTextResult = fitText({
    text,
    withinWidth: textContentWidth,
    fontFamily: "system-ui, sans-serif",
    fontWeight: "500",
    maxFontSize: Math.max(72, width * 0.065),
    minFontSize: 48,
  });
  const baseFontSize = Math.max(56, Math.min(fitTextResult.fontSize, width * 0.052));

  // Use fillTextBox to wrap text into lines that fit within the container
  // This follows measuring-text.md pattern for checking text overflow
  const textBox = fillTextBox({
    maxBoxWidth: textContentWidth,
    maxLines: 10, // Allow up to 10 lines
    fontSize: baseFontSize,
    fontFamily: "system-ui, sans-serif",
    fontWeight: "500",
    lineHeight: 1.4,
  });

  const words = text.split(" ");
  const emphasisSet = new Set(emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")));

  // Build lines using fillTextBox - add words one by one until they exceed the box
  const lines: TextLine[] = [];
  let currentLineWords: string[] = [];
  let currentLineStartFrame = 0;

  // Calculate timing constants
  const iconDuration = Math.round(durationInFrames * iconDurPct);
  const textStartDelay = Math.round(durationInFrames * textStartDelayPct);
  const wordDuration = Math.round(durationInFrames * wordDurPct);
  const wordStagger = Math.round(durationInFrames * wordStaggerPct);

  // First, determine line breaks by simulating fillTextBox using the add() method
  // We'll use measureText to check line widths instead
  let testLineWords: string[] = [];
  const lineBreaks: number[] = []; // Indices where lines break

  for (let i = 0; i < words.length; i++) {
    testLineWords.push(words[i]);
    const testText = testLineWords.join(" ");
    const { width: lineWidth } = measureText({
      text: testText,
      fontFamily: "system-ui, sans-serif",
      fontSize: baseFontSize,
      fontWeight: "500",
    });

    if (lineWidth > textContentWidth && testLineWords.length > 1) {
      // This word would overflow, break before it
      lineBreaks.push(i);
      testLineWords = [words[i]];
    }
  }

  // Build line objects with timing
  let wordIndex = 0;
  let lineStartWordIndex = 0;

  for (const breakIndex of [...lineBreaks, words.length]) {
    const lineWords = words.slice(lineStartWordIndex, breakIndex);
    const lineWordCount = lineWords.length;

    const lineStartFrame = textStartDelay + iconDuration + lineStartWordIndex * wordStagger;
    const lineEndFrame = lineStartFrame + (lineWordCount - 1) * wordStagger + wordDuration;

    lines.push({
      words: lineWords,
      startFrame: lineStartFrame,
      endFrame: lineEndFrame,
    });

    lineStartWordIndex = breakIndex;
  }

  // Calculate total text end frame (last word of last line)
  const totalWords = words.length;
  const textEndFrame = textStartDelay + iconDuration + (totalWords - 1) * wordStagger + wordDuration;
  const sliderStart = textEndFrame;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress animations
  const iconProgress = interpolate(frame, [0, iconDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle state — begins after textEndFrame (Rule 1)
  const isIdle = frame > textEndFrame;
  const idleTimeSeconds = isIdle ? (frame - textEndFrame) / fps : 0;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Card bounce animation (idle) - 6px vertical bounce matching other components
  const cardBounceY = isIdle ? 6 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 0;

  // Glow pulse animation (idle)
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Shimmer timing — starts after text animation completes
  const shimmerStart = textEndFrame;
  const shimmerSpeed = 25; // % per second

  // Shimmer position calculation
  const getShimmerTop = (shimmerStartFrame: number) => {
    if (frame < shimmerStartFrame) return "-100%";
    const elapsedSeconds = (frame - shimmerStartFrame) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };

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

  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Assign annotations per emphasized word (cycle through styles)
  let emphasisRunIndex = 0;
  const wordAnnotations: (typeof ANNOTATION_CYCLE[0] | null)[] = words.map((word) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, "");
    if (!emphasisSet.has(cleanWord)) return null;
    const entry = ANNOTATION_CYCLE[emphasisRunIndex % ANNOTATION_CYCLE.length];
    emphasisRunIndex += 1;
    return entry;
  });

  // Resolve fallback Lucide icon
  const LucideFallback = LUCIDE_FALLBACK_MAP[icon.toLowerCase()] || DefaultLucideIcon;

  // Render icon (Lottie if loaded, Lucide fallback if failed/not loaded yet)
  const renderIcon = () => {
    if (animationData) {
      return (
        <Lottie
          animationData={animationData}
          style={{ width: 120, height: 120 }}
        />
      );
    }
    // Fallback to Lucide icon (shows immediately in Studio)
    return (
      <LucideFallback
        size={120}
        color={ACCENT_COLOR}
        strokeWidth={2}
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
          transform: `translateY(-50%) translateY(${cardBounceY}px)`,
          width: availableWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          willChange: "transform",
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

          {/* Elevated card for the icon + text - with prominent curved borders */}
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
              gap: 24,
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
                background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
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
              {/* Icon with entrance animation (Lottie or Lucide fallback) */}
              <div
                style={{
                  transform: [
                    { scale: interpolate(iconProgress, [0, 1], [0.5, 1], {
                      easing: Easing.spring({ damping: 200 }),
                      output: "perceptual-scale",
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }) },
                    { rotate: isIdle ? `${2 * Math.sin(frame * 0.04)}deg` : "0deg" },
                  ],
                  opacity: iconProgress,
                  transformOrigin: "center",
                  willChange: "transform, opacity",
                }}
              >
                {renderIcon()}
              </div>

              {/* Text with line-by-line word animation + rough-notation highlights */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "center",
                }}
              >
                {lines.map((line, lineIndex) => {
                  const lineWords = line.words;
                  const lineWordCount = lineWords.length;

                  return (
                    <div
                      key={lineIndex}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {lineWords.map((word, wordInLineIndex) => {
                        const globalWordIndex = words.indexOf(word, 
                          lines.slice(0, lineIndex).reduce((sum, l) => sum + l.words.length, 0)
                        );
                        
                        const wordStartFrame = textStartDelay + iconDuration + globalWordIndex * wordStagger;
                        const wordEndFrame = wordStartFrame + wordDuration;

                        const wordProgress = interpolate(frame, [wordStartFrame, wordEndFrame], [0, 1], {
                          easing: easeOutExpo,
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        });

                        const wordOpacity = wordProgress;
                        const wordY = interpolate(wordProgress, [0, 1], [30, 0], {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        });
                        const wordScale = interpolate(wordProgress, [0, 1], [0.8, 1], {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        });

                        // Idle animation for words: subtle vertical drift
                        const wordIdleDrift = isIdle ? 2 * Math.sin(frame * 0.05 + globalWordIndex * 0.5) : 0;
                        const wordIdleScale = isIdle ? 1 + 0.01 * Math.sin(frame * 0.07 + globalWordIndex) : 1;

                        const annotation = wordAnnotations[globalWordIndex];
                        const wordHasEmphasis = !!annotation;

                        const wordContent = (
                          <span
                            style={{
                              fontSize: baseFontSize,
                              fontWeight: wordHasEmphasis ? 700 : 500,
                              color: DARK_TEXT,
                              fontFamily: "system-ui, sans-serif",
                              lineHeight: 1.4,
                              letterSpacing: -1,
                              textAlign: "center",
                              textShadow: isIdle ? `0 0 ${2 + Math.sin(frame * 0.08 + globalWordIndex) * 2}px rgba(232, 108, 0, 0.15)` : "none",
                              ...(wordHasEmphasis
                                ? {
                                    backgroundImage: `linear-gradient(120deg, ${ACCENT_COLOR}, ${ACCENT_LIGHT})`,
                                    WebkitBackgroundClip: "text",
                                    backgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                  }
                                : {}),
                            }}
                          >
                            {word}
                          </span>
                        );

                        const renderedWord = wordHasEmphasis && annotation ? (
                          <annotation.Component
                            key={globalWordIndex}
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
                          </annotation.Component>
                        ) : (
                          <span key={globalWordIndex}>{wordContent}</span>
                        );

                        return (
                          <span
                            key={globalWordIndex}
                            style={{
                              display: "inline",
                              opacity: wordOpacity,
                              transform: `translateY(${wordY + wordIdleDrift}px) scale(${wordScale * wordIdleScale})`,
                              transformOrigin: "center",
                              willChange: "transform, opacity",
                              margin: "0 2px",
                            }}
                          >
                            {renderedWord}{globalWordIndex < totalWords - 1 ? " " : ""}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
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

// Test composition for isolated preview/render
export const IconTextTestComposition: React.FC = () => (
  <Composition
    id="IconTextTest"
    component={IconText}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      icon: "risk",
      text: "Broadcom only guarantees part of the loan",
      emphasisWords: ["guarantees", "part"],
      durationInFrames: 150,
    }}
  />
);
