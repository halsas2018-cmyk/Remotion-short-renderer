import React, { Suspense, lazy } from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

// Lazy load Highlight to handle import errors gracefully
const Highlight = lazy(() => 
  import("@remotion/rough-notation")
    .then((module) => ({ default: module.Highlight }))
    .catch(() => ({
      default: ({ children }: any) => <>{children}</>,
    }))
);

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
const easeOutBack = Easing.bezier(0.34, 1.56, 0.64, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#fff4ed";
const ACCENT_GLOW = "rgba(232, 108, 0, 0.4)";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const LIGHT_TEXT = "#a3a3a3";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_SHADOW_HOVER = "0 20px 50px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

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

  // Idle pulse — time-based
  const allAnimationsDone = textEndFrame;
  const isIdle = frame > allAnimationsDone;
  const idleTimeSeconds = (frame - allAnimationsDone) / fps;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Shimmer timing
  const shimmerSpeed = 25;
  const shimmerStart = textEndFrame;

  // Split text into words and mark emphasis
  const emphasisSet = new Set(emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]$/, "")));
  const totalWordsCount = words.length;

  // Card bounce during idle
  const cardBounceFrequency = 0.08;
  const cardBounceAmplitude = 6;
  const cardBounceOffset = isIdle
    ? Math.sin(frame * cardBounceFrequency * Math.PI * 2) * cardBounceAmplitude
    : 0;

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
  const containerHeight = 400; // Approximate card height
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const baseFontSize = Math.max(64, width * 0.059); // Main headline: 84px minimum
  const emphasisFontSize = Math.max(76, width * 0.07);

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

  // Decorative accent elements
  const AccentDot = ({ 
    size = 8, 
    color = ACCENT_COLOR, 
    baseDelay = 0, 
    opacity = 1,
    animate = false 
  }) => {
    const pulse = animate && isIdle 
      ? 1 + 0.3 * Math.sin(frame * 0.2 + baseDelay) 
      : 1;
    const float = animate && isIdle 
      ? 4 * Math.sin(frame * 0.15 + baseDelay) 
      : 0;
    
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: opacity * pulse,
          transform: `translateY(${float}px)`,
          flexShrink: 0,
          filter: animate && isIdle ? `drop-shadow(0 0 ${4 + 2 * Math.sin(frame * 0.1 + baseDelay)}px ${ACCENT_GLOW})` : "none",
        }}
      />
    );
  };

  // Decorative line separator
  const DecorativeLine = ({ 
    width = 60, 
    height = 2, 
    color = ACCENT_COLOR, 
    opacity = 1,
    animate = false 
  }) => {
    const pulse = animate && isIdle 
      ? 0.6 + 0.2 * Math.sin(frame * 0.08) 
      : opacity;
    const glow = animate && isIdle 
      ? `drop-shadow(0 0 ${4 + 2 * Math.sin(frame * 0.1)}px ${ACCENT_GLOW})` 
      : "none";
    
    return (
      <div
        style={{
          width,
          height,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          borderRadius: height / 2,
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

          {/* Elevated card for the key statement - with prominent curved borders */}
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
                { translateY: cardBounceOffset },
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

            {/* Decorative accent dots at top */}
            <div
              style={{
                position: "absolute",
                top: cardPadding - 10,
                left: "50%",
                transform: "translateX(-50%)",
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
                  fontWeight: 700,
                  fontFamily: "system-ui, sans-serif",
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
                  
                  // Word entrance animation
                  const wordStartFrame = textStartDelay + i * wordStagger;
                  const wordEndFrame = wordStartFrame + wordDuration;
                  
                  const wordProgress = interpolate(frame, [wordStartFrame, wordEndFrame], [0, 1], {
                    easing: easeOutExpo,
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  
                  const wordOpacity = wordProgress;
                  const wordY = interpolate(wordProgress, [0, 1], [40, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const wordScale = interpolate(wordProgress, [0, 1], [0.7, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const wordRotation = interpolate(wordProgress, [0, 1], [-5, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  
                  // Fast bouncing animation for emphasized words (idle loop)
                  const bounceOffset = isIdle && isEmphasized 
                    ? Math.sin(frame * bounceFrequency * Math.PI * 2) * bounceAmplitude 
                    : 0;
                  
                  // Idle animation for emphasized words: subtle scale pulse
                  const idlePulse = isIdle && isEmphasized ? 1 + 0.04 * Math.sin(frame * 0.12 + i) : 1;
                  
                  // Base font size - emphasized words are larger
                  const wordFontSize = isEmphasized ? emphasisFontSize : baseFontSize;
                  const wordFontWeight = isEmphasized ? 900 : 700;
                  const wordColor = isEmphasized ? ACCENT_COLOR : DARK_TEXT;

                  // Emphasized word idle animations
                  const emphasisGlow = isIdle && isEmphasized 
                    ? `0 0 ${8 + 4 * Math.sin(frame * 0.15 + i)}px ${ACCENT_GLOW}, 0 0 ${16 + 8 * Math.sin(frame * 0.1 + i)}px ${ACCENT_GLOW}` 
                    : "none";
                  const emphasisFloat = isIdle && isEmphasized 
                    ? 3 * Math.sin(frame * 0.08 + i) 
                    : 0;

                  // Rough-notation highlight progress - animates in with the word
                  const highlightProgress = isEmphasized 
                    ? interpolate(frame, [wordStartFrame, wordEndFrame + 5], [0, 1], {
                        easing: easeOutExpo,
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })
                    : 1;

                  const wordContent = (
                    <span
                      style={{
                        display: "inline-block",
                        opacity: wordOpacity,
                        transform: `translateY(${wordY + bounceOffset + emphasisFloat}px) scale(${wordScale * idlePulse}) rotate(${wordRotation}deg)`,
                        transformOrigin: "center bottom",
                        fontSize: wordFontSize,
                        fontWeight: wordFontWeight,
                        color: wordColor,
                        fontFamily: "system-ui, sans-serif",
                        lineHeight: 1.3,
                        margin: "0 0.04em",
                        textShadow: emphasisGlow,
                        willChange: "transform, opacity, text-shadow",
                      }}
                    >
                      {word}{i < totalWordsCount - 1 ? " " : ""}
                    </span>
                  );

                  // Wrap emphasized words with Highlight from rough-notation
                  if (isEmphasized) {
                    return (
                      <Suspense fallback={wordContent} key={i}>
                        <Highlight
                          color="rgba(232, 108, 0, 0.25)"
                          strokeWidth={3}
                          padding={6}
                          cornerRadius={8}
                          progress={highlightProgress}
                          animationDuration={0} // We control progress manually
                        >
                          {wordContent}
                        </Highlight>
                      </Suspense>
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
