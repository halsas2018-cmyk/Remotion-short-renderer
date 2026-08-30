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

interface LocationPulseProps {
  locationName: string;
  latitude: number;
  longitude: number;
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

export const LocationPulse: React.FC<LocationPulseProps> = ({
  locationName,
  latitude,
  longitude,
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // 30-40% entrance rule
  const gridEnd = Math.round(durationInFrames * 0.15);
  const pinStart = Math.round(durationInFrames * 0.15);
  const pinEnd = pinStart + Math.round(durationInFrames * 0.10);
  const labelStart = Math.round(durationInFrames * 0.25);
  const labelEnd = labelStart + Math.round(durationInFrames * 0.10);
  const entranceEndFrame = Math.max(pinEnd, labelEnd);
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const gridProgress = interpolate(frame, [0, gridEnd], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pinProgress = interpolate(frame, [pinStart, pinEnd], [0, 1], {
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

  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardPadding = Math.max(40, width * 0.04);
  const cardBorderRadius = Math.max(32, width * 0.03);
  const mapHeight = Math.min(400, height * 0.28);
  const mapWidth = availableWidth - 2 * cardPadding;

  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const nameFit = fitText({
    text: locationName,
    withinWidth: availableWidth - 2 * cardPadding,
    fontFamily,
    fontWeight: "700",
  });
  const nameFontSize = Math.min(Math.max(56, width * 0.052), nameFit.fontSize);
  const coordFontSize = Math.max(20, width * 0.018);

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

  // Pulse ring state (idle): scale grows from 1 → 2.5, opacity 0.6 → 0
  const ringScale =
    isIdle ? 1 + (1.5 * ((frame - entranceEndFrame) % 60)) / 60 : 1;
  const ringOpacity = isIdle ? Math.max(0, 0.6 * (1 - (ringScale - 1) / 1.5)) : 0;

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
              {/* Location name */}
              <div
                style={{
                  fontSize: nameFontSize,
                  fontWeight: 700,
                  fontFamily,
                  color: DARK_TEXT,
                  lineHeight: 1.2,
                  letterSpacing: -1.5,
                  textAlign: "center",
                  wordBreak: "break-word",
                  maxWidth: "100%",
                  opacity: labelProgress,
                  translate: `0px ${interpolate(labelProgress, [0, 1], [20, 0])}px`,
                }}
              >
                {locationName}
              </div>

              {/* 2D map area */}
              <div
                style={{
                  width: mapWidth,
                  height: mapHeight,
                  position: "relative",
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #f8f8f8, #eaeaea)",
                  overflow: "hidden",
                  border: `1px solid ${CARD_BORDER}`,
                  opacity: gridProgress,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `linear-gradient(rgba(232, 108, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 108, 0, 0.08) 1px, transparent 1px)`,
                    backgroundSize: `${mapWidth / 8}px ${mapHeight / 8}px`,
                  }}
                />
                {/* Concentric pulse ring (idle) */}
                {isIdle && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      border: `2px solid ${ACCENT_COLOR}`,
                      transform: `translate(-50%, -50%) scale(${ringScale})`,
                      opacity: ringOpacity,
                      pointerEvents: "none",
                    }}
                  />
                )}
                {/* Pin */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    opacity: pinProgress,
                    scale: interpolate(pinProgress, [0, 1], [0.3, 1], {
                      easing: Easing.spring({ damping: 200 }),
                      output: "perceptual-scale",
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: ACCENT_COLOR,
                      borderRadius: "50% 50% 50% 0",
                      transform: "rotate(-45deg)",
                      boxShadow: `0 4px 20px ${ACCENT_GLOW}`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%) rotate(45deg)",
                        width: 12,
                        height: 12,
                        background: "white",
                        borderRadius: "50%",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div
                style={{
                  fontSize: coordFontSize,
                  fontWeight: 500,
                  fontFamily,
                  color: MEDIUM_TEXT,
                  letterSpacing: 1,
                  opacity: labelProgress,
                  translate: `0px ${interpolate(labelProgress, [0, 1], [15, 0])}px`,
                }}
              >
                {latitude.toFixed(2)}°N, {longitude.toFixed(2)}°E
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

export const LocationPulseTestComposition: React.FC = () => (
  <Composition
    id="LocationPulseTest"
    component={LocationPulse}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      locationName: "Cupertino, California",
      latitude: 37.33,
      longitude: -122.03,
    }}
  />
);
