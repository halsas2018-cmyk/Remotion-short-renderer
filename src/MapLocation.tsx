import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface MapLocationProps {
  locationName: string;
  latitude: number;
  longitude: number;
  durationInFrames?: number; // Optional override; defaults to composition duration
  // Timing percentages for internal animation only
  mapDurPct?: number;
  pinDurPct?: number;
  labelDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#fff4ed";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const LIGHT_TEXT = "#a3a3a3";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_SHADOW_HOVER = "0 20px 50px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08)";
const MAP_FILL = "#f0f0f0";
const MAP_STROKE = "#d0d0d0";
const PIN_COLOR = ACCENT_COLOR;
const PIN_INNER = "white";
const SLIDER_COLOR = "#1a1a1a";
const CARD_BORDER = "#e8e8e8";

// Simplified world map path (abstract silhouette) - centered in viewBox
const WORLD_MAP_PATH = `
  M 100 200
  Q 150 150 200 180
  Q 250 140 300 170
  Q 350 130 400 160
  Q 450 120 500 150
  Q 550 110 600 140
  Q 650 100 700 130
  Q 750 90 800 120
  Q 850 80 900 110
  L 900 400
  Q 850 420 800 400
  Q 750 380 700 410
  Q 650 430 600 400
  Q 550 380 500 410
  Q 450 430 400 400
  Q 350 380 300 410
  Q 250 430 200 400
  Q 150 380 100 410
  Z
  M 300 250
  Q 350 220 400 240
  Q 450 210 500 230
  Q 550 200 600 220
  L 600 350
  Q 550 370 500 350
  Q 450 330 400 360
  Q 350 380 300 350
  Z
  M 150 280
  Q 200 260 250 270
  L 250 320
  Q 200 330 150 320
  Z
  M 650 180
  Q 700 160 750 170
  L 750 220
  Q 700 230 650 220
  Z
  M 400 300
  Q 450 280 500 290
  L 500 330
  Q 450 340 400 330
  Z
`.trim();

export const MapLocation: React.FC<MapLocationProps> = ({
  locationName,
  latitude,
  longitude,
  durationInFrames: propsDurationInFrames,
  mapDurPct = 0.15,
  pinDurPct = 0.15,
  labelDurPct = 0.10,
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
  const mapDuration = Math.round(durationInFrames * mapDurPct);
  const pinDuration = Math.round(durationInFrames * pinDurPct);
  const labelDuration = Math.round(durationInFrames * labelDurPct);
  const mapStart = 0;
  const pinStart = mapStart + mapDuration;
  const labelStart = pinStart + pinDuration - Math.round(durationInFrames * 0.05); // Overlap slightly
  const mapEnd = mapStart + mapDuration;
  const pinEnd = pinStart + pinDuration;
  const labelEnd = labelStart + labelDuration;
  const allAnimEnd = Math.max(mapEnd, pinEnd, labelEnd);
  const sliderStart = allAnimEnd;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress animations
  const mapProgress = interpolate(frame, [mapStart, mapStart + mapDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pinProgress = interpolate(frame, [pinStart, pinStart + pinDuration], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1), // bounce
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelProgress = interpolate(frame, [labelStart, labelStart + labelDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sliderProgress = interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle pulse — time-based
  const allAnimationsDone = allAnimEnd;
  const isIdle = frame > allAnimationsDone;
  const idleTimeSeconds = (frame - allAnimationsDone) / fps;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Shimmer timing
  const shimmerSpeed = 25;
  const shimmerStart = allAnimEnd;

  // Card bounce during idle
  const cardBounceFrequency = 0.08;
  const cardBounceAmplitude = 6;
  const cardBounceOffset = isIdle
    ? Math.sin(frame * cardBounceFrequency * Math.PI * 2) * cardBounceAmplitude
    : 0;

  // Pin idle animations
  const pinIdlePulse = isIdle ? 1 + 0.03 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.5) : 1;
  const pinIdleFloat = isIdle ? 4 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.3) : 0;

  // Glow pulse animation (idle)
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const mapWidth = Math.min(800, availableWidth);
  const mapHeight = Math.min(450, height * 0.4);
  const cardBorderRadius = Math.max(24, width * 0.022);

  // Container dimensions (for slider)
  const containerWidth = mapWidth;
  const containerHeight = mapHeight + 80; // Extra space for label
  const sliderPadding = 24;
  const sliderWidth = containerWidth + 2 * sliderPadding;
  const sliderHeight = containerHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const labelFontSize = Math.max(32, width * 0.03);
  const coordFontSize = Math.max(18, width * 0.017);

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
  const sliderDashOffset = sliderPerimeter * (1 - sliderProgress);

  // Convert lat/long to map coordinates (approximate for our abstract map)
  // Map bounds roughly: lat -60 to 70, long -180 to 180
  // SVG viewBox: 0 0 1000 500
  const normLong = (longitude + 180) / 360; // 0 to 1
  const normLat = (70 - latitude) / 130; // 0 to 1 (inverted)

  const pinX = normLong * mapWidth;
  const pinY = normLat * mapHeight;

  const pinSize = 28;
  const pinDropHeight = -200;

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
        position: "relative",
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
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Card container - explicit dimensions matching card outer size */}
        <div
          style={{
            position: "relative",
            width: containerWidth,
            height: containerHeight,
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

          {/* Map container - elevated card with prominent curved borders */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "white",
              borderRadius: cardBorderRadius,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${CARD_BORDER}`,
              boxSizing: "border-box",
              overflow: "hidden",
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

            {/* World Map SVG */}
            <svg
              width={mapWidth}
              height={mapHeight}
              viewBox="0 0 1000 500"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                opacity: mapProgress,
                transformOrigin: "center",
                transform: [{ scale: mapProgress }],
              }}
            >
              <path
                d={WORLD_MAP_PATH}
                fill={MAP_FILL}
                stroke={MAP_STROKE}
                strokeWidth={2}
              />
            </svg>

            {/* Pin */}
            <div
              style={{
                position: "absolute",
                left: pinX - pinSize / 2,
                top: pinY - pinSize - pinDropHeight * (1 - pinProgress) + pinIdleFloat,
                transformOrigin: "bottom center",
                transform: [
                  { scale: pinProgress * pinIdlePulse },
                  { rotate: `${interpolate(pinProgress, [0, 0.5, 1], [-15, 10, 0])}deg` },
                ],
                opacity: pinProgress,
                zIndex: 10,
              }}
            >
              {/* Pin shadow */}
              <div
                style={{
                  width: pinSize * 1.5,
                  height: pinSize * 0.3,
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 0, 0, 0.15)",
                  position: "absolute",
                  bottom: -pinSize * 0.2,
                  left: "50%",
                  transform: [{ translateX: -50 }, { scaleX: pinProgress }],
                  opacity: pinProgress * 0.5,
                }}
              />
              {/* Pin body - elevated with shadow */}
              <div
                style={{
                  width: pinSize,
                  height: pinSize,
                  borderRadius: "50% 50% 50% 0",
                  backgroundColor: PIN_COLOR,
                  transform: [{ rotate: "45deg" }],
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: `0 4px 20px rgba(232, 108, 0, 0.4)`,
                }}
              >
                <div
                  style={{
                    width: pinSize * 0.5,
                    height: pinSize * 0.5,
                    borderRadius: "50%",
                    backgroundColor: PIN_INNER,
                    transform: [{ rotate: "-45deg" }],
                  }}
                />
              </div>
            </div>

            {/* Location name label - elevated card */}
            <div
              style={{
                position: "absolute",
                left: pinX,
                top: pinY + pinSize + 20,
                transform: [{ translateX: -50 }],
                textAlign: "center",
                whiteSpace: "nowrap",
                opacity: labelProgress,
                transformOrigin: "top center",
                transform: [{ scale: labelProgress }],
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: 12,
                  padding: "8px 16px",
                  boxShadow: CARD_SHADOW,
                  border: `1px solid ${CARD_BORDER}`,
                }}
              >
                <div
                  style={{
                    fontSize: labelFontSize,
                    fontWeight: 800,
                    color: DARK_TEXT,
                    fontFamily: "system-ui, sans-serif",
                    letterSpacing: -1,
                  }}
                >
                  {locationName}
                </div>
                <div
                  style={{
                    fontSize: coordFontSize,
                    fontWeight: 500,
                    color: MEDIUM_TEXT,
                    fontFamily: "system-ui, sans-serif",
                    marginTop: 4,
                  }}
                >
                  {latitude >= 0 ? latitude.toFixed(2) : Math.abs(latitude).toFixed(2)}°{latitude >= 0 ? "N" : "S"} 
                  {longitude >= 0 ? longitude.toFixed(2) : Math.abs(longitude).toFixed(2)}°{longitude >= 0 ? "E" : "W"}
                </div>
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

export const MapLocationTestComposition: React.FC = () => (
  <Composition
    id="MapLocationTest"
    component={MapLocation}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      locationName: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
    }}
  />
);

// Test with different location
export const MapLocationTokyoTest: React.FC = () => (
  <Composition
    id="MapLocationTokyoTest"
    component={MapLocation}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      locationName: "Tokyo",
      latitude: 35.6762,
      longitude: 139.6503,
    }}
  />
);

// Test with longer duration for slower animation
export const MapLocationLongTest: React.FC = () => (
  <Composition
    id="MapLocationLongTest"
    component={MapLocation}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      locationName: "London",
      latitude: 51.5074,
      longitude: -0.1278,
    }}
  />
);
