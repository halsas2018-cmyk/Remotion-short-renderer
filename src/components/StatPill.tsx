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
import { fitText } from "@remotion/layout-utils";
import { useIdleMotion } from "../lib/idleMotion";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface StatPillProps {
  value: number | string;
  label: string;
  prefix?: string;
  suffix?: string;
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

function formatNumber(n: number | string): string {
  if (typeof n === "string") return n;
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(abs >= 1e13 ? 0 : 1).replace(/\.0$/, "")}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace(/\.0$/, "")}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

export const StatPill: React.FC<StatPillProps> = ({
  value,
  label,
  prefix = "",
  suffix = "",
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // 30-40% entrance rule
  const valueDuration = Math.round(durationInFrames * 0.20);
  const labelStart = Math.round(durationInFrames * 0.22);
  const labelDuration = Math.round(durationInFrames * 0.10);
  const labelEnd = labelStart + labelDuration;
  const entranceEndFrame = Math.max(valueDuration, labelEnd);
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const valueProgress = interpolate(frame, [0, valueDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelProgress = interpolate(frame, [labelStart, labelEnd], [0, 1], {
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
  // Card idle bounce + 3D tilt (shared useIdleMotion hook).
  // We pass `glow: false` because the card transform doesn't use scale,
  // and the radial-blur glow sibling has its own scale: glowPulse local.
  const idle = useIdleMotion({
    bounce: isIdle,
    tilt: isIdle,
    glow: false,
  });
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;
  const numberIdleScale = isIdle ? 1 + 0.04 * Math.sin(frame * 0.12) : 1;

  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(48, width * 0.044);
  const cardBorderRadius = Math.max(48, width * 0.05); // Pill = more rounded
  const cardHeight = Math.max(280, height * 0.22);
  const cardWidth = Math.min(availableWidth, 720);

  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const valueText = `${prefix}${formatNumber(value)}${suffix}`;
  const valueFit = fitText({
    text: valueText,
    withinWidth: cardWidth - 2 * cardPadding,
    fontFamily,
    fontWeight: "700",
  });
  const valueFontSize = Math.min(Math.max(96, width * 0.09), valueFit.fontSize);
  const labelFontSize = Math.max(24, width * 0.024);

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
        <div style={{ position: "relative", width: cardWidth, perspective: 1200 }}>
          {/* Slider border */}
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
            {/* Diagonal pattern */}
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
              <AccentDot size={6} baseDelay={0} />
              <AccentDot size={8} baseDelay={0.5} />
              <AccentDot size={6} baseDelay={1} />
            </div>

            {/* Content */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: valueFontSize,
                  fontWeight: 700,
                  fontFamily,
                  lineHeight: 1,
                  letterSpacing: -3,
                  backgroundImage: `linear-gradient(120deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  opacity: valueProgress,
                  transform: [
                    {
                      scale: interpolate(
                        valueProgress,
                        [0, 1],
                        [0.5, numberIdleScale],
                        {
                          easing: Easing.spring({ damping: 200 }),
                          output: "perceptual-scale",
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        },
                      ),
                    },
                  ],
                  transformOrigin: "center",
                  willChange: "transform, opacity",
                  filter: isIdle
                    ? `drop-shadow(0 0 ${12 + 4 * Math.sin(frame * 0.1)}px ${ACCENT_GLOW})`
                    : "none",
                }}
              >
                {valueText}
              </div>
              <div
                style={{
                  fontSize: labelFontSize,
                  fontWeight: 700,
                  fontFamily,
                  color: DARK_TEXT,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  opacity: labelProgress,
                  translate: `0px ${interpolate(labelProgress, [0, 1], [20, 0])}px`,
                }}
              >
                {label}
              </div>
            </div>

            {/* Decorative line below */}
            <div
              style={{
                marginTop: 12,
                width: 60,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)`,
                borderRadius: 1,
                opacity: isIdle
                  ? 0.6 + 0.2 * Math.sin(frame * 0.08)
                  : labelProgress * 0.4,
              }}
            />

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

export const StatPillTestComposition: React.FC = () => (
  <Composition
    id="StatPillTest"
    component={StatPill}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      value: 70_000_000_000,
      label: "in debt",
    }}
  />
);
