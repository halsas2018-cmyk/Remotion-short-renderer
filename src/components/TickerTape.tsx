import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface TickerTapeProps {
  stories: string[];
  label?: string;
  durationInFrames?: number;
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

export const TickerTape: React.FC<TickerTapeProps> = ({
  stories,
  label = "BREAKING",
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // 30-40% entrance rule
  const tapeStart = Math.round(durationInFrames * 0.05);
  const tapeDuration = Math.round(durationInFrames * 0.10);
  const tapeEnd = tapeStart + tapeDuration;
  const entranceEndFrame = tapeEnd;
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const tapeProgress = interpolate(frame, [tapeStart, tapeEnd], [0, 1], {
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

  // Ticker is full-width, narrow height
  const padding = Math.max(60, width * 0.08);
  const availableWidth = width - 2 * padding;
  const tapeHeight = Math.max(120, height * 0.10);
  const cardBorderRadius = Math.max(20, tapeHeight * 0.16);

  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const labelFontSize = Math.max(28, tapeHeight * 0.24);
  const storyFontSize = Math.max(24, tapeHeight * 0.20);

  // Build scrolling content (duplicated for seamless loop)
  const storyText = stories.map((s) => s.toUpperCase()).join("   •   ");
  const contentText = `${storyText}   •   ${storyText}   •   `;
  // Heuristic width: ~0.55× fontSize per character in Space Grotesk
  const estimatedContentWidth = contentText.length * storyFontSize * 0.55;

  // Linear scroll across the idle phase
  const scrollEnd = Math.max(sliderStart + 1, durationInFrames);
  const scrollProgress = interpolate(frame, [sliderStart, scrollEnd], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const contentTranslateX = -(estimatedContentWidth / 2) * scrollProgress;

  const shimmerStart = entranceEndFrame;
  const shimmerSpeed = 25;
  const getShimmerTop = (s: number) => {
    if (frame < s) return "-100%";
    const elapsedSeconds = (frame - s) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };
  const getShimmerOpacity = (s: number) => (frame < s ? 0 : 1);

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
              height: tapeHeight,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "stretch",
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
              overflow: "hidden",
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
                zIndex: 3,
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

            {/* Label box on the left */}
            <div
              style={{
                flexShrink: 0,
                width: Math.max(180, label.length * labelFontSize * 0.6 + 40),
                background: `linear-gradient(135deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                color: "white",
                fontWeight: 700,
                fontSize: labelFontSize,
                fontFamily,
                letterSpacing: 2,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
                opacity: tapeProgress,
                filter: isIdle
                  ? `drop-shadow(0 0 ${8 + 4 * Math.sin(frame * 0.15)}px ${ACCENT_GLOW})`
                  : "none",
                position: "relative",
                zIndex: 2,
              }}
            >
              {label}
            </div>

            {/* Scrolling content area */}
            <div
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                opacity: tapeProgress,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  transform: `translateX(${contentTranslateX}px)`,
                }}
              >
                <span
                  style={{
                    fontSize: storyFontSize,
                    fontWeight: 500,
                    fontFamily,
                    color: DARK_TEXT,
                    letterSpacing: 0.5,
                    paddingRight: 40,
                  }}
                >
                  {contentText}
                </span>
              </div>
              {/* Left fade */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 40,
                  height: "100%",
                  background: "linear-gradient(90deg, white 0%, transparent 100%)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
              {/* Right fade */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 40,
                  height: "100%",
                  background: "linear-gradient(270deg, white 0%, transparent 100%)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
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

export const TickerTapeTestComposition: React.FC = () => (
  <Composition
    id="TickerTapeTest"
    component={TickerTape}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      stories: [
        "FED HOLDS RATES STEADY",
        "AI CHIP DEMAND SURGES",
        "TECH EARNINGS BEAT EXPECTATIONS",
        "EUROPEAN MARKETS RALLY",
        "OIL PRICES CLIMB",
      ],
      label: "BREAKING",
    }}
  />
);
