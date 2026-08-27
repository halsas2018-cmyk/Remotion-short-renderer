import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

interface Map3DProps {
  locationName: string;
  latitude: number;
  longitude: number;
  buildings?: number;
  durationInFrames?: number;
}

const ACCENT_COLOR = "#e86c00";
const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT_COLOR}, #f97316)`;
const CARD_BG = "#ffffff";
const BORDER_COLOR = "#e8e8e8";
const SHADOW = "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)";
const SLIDER_BORDER_COLOR = "#1a1a1a";

export const Map3D: React.FC<Map3DProps> = ({
  locationName,
  latitude,
  longitude,
  buildings = 8,
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // Timing calculations
  const mapEntranceEnd = Math.round(durationInFrames * 0.25);
  const pinDropEnd = Math.round(durationInFrames * 0.35);
  const labelEntranceEnd = Math.round(durationInFrames * 0.45);
  const sliderStart = Math.round(durationInFrames * 0.5);
  const sliderEnd = Math.round(durationInFrames * 0.75);
  const idleStart = Math.round(durationInFrames * 0.75);

  // Map container dimensions
  const mapWidth = Math.min(width * 0.85, 900);
  const mapHeight = Math.min(height * 0.55, 800);
  const mapX = (width - mapWidth) / 2;
  const mapY = (height - mapHeight) / 2 - 40;

  // 3D perspective
  const perspective = 1200;
  const rotateX = interpolate(frame, [0, mapEntranceEnd], [35, 20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const rotateZ = interpolate(frame, [0, mapEntranceEnd], [-8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Map scale entrance
  const mapScale = interpolate(frame, [0, mapEntranceEnd], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Pin drop animation
  const pinDropProgress = interpolate(frame, [mapEntranceEnd, pinDropEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.spring({ damping: 200 }),
  });
  const pinY = interpolate(pinDropProgress, [0, 1], [-200, 0]);
  const pinScale = interpolate(pinDropProgress, [0, 0.6, 1], [0.3, 1.2, 1]);
  const pinRotation = interpolate(pinDropProgress, [0, 0.7, 1], [-15, 10, 0]);

  // Label entrance
  const labelOpacity = interpolate(frame, [pinDropEnd, labelEntranceEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const labelY = interpolate(frame, [pinDropEnd, labelEntranceEnd], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Slider border
  const sliderProgress = interpolate(frame, [sliderStart, sliderEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const sliderDashOffset = interpolate(sliderProgress, [0, 1], [1000, 0]);

  // Idle animations
  const isIdle = frame >= idleStart;
  const idlePulse = isIdle
    ? interpolate(frame, [idleStart, idleStart + 30], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      })
    : 0;
  const glowOpacity = isIdle ? 0.3 + idlePulse * 0.2 : 0;
  const pinFloat = isIdle ? Math.sin(frame * 0.1) * 6 : 0;

  // Shimmer
  const shimmerProgress = isIdle
    ? interpolate(frame, [idleStart, idleStart + 60], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.linear,
      })
    : 0;
  const shimmerY = shimmerProgress * mapHeight;

  // Generate building positions
  const buildingPositions = Array.from({ length: buildings }, (_, i) => {
    const angle = (i / buildings) * Math.PI * 2;
    const radius = mapWidth * 0.3;
    const x = mapWidth / 2 + Math.cos(angle) * radius;
    const y = mapHeight / 2 + Math.sin(angle) * radius * 0.6;
    const buildingHeight = 40 + (i % 3) * 30;
    const buildingWidth = 30 + (i % 2) * 20;
    return { x, y, buildingHeight, buildingWidth };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      {/* Card container */}
      <div
        style={{
          position: "relative",
          width: mapWidth + 48,
          height: mapHeight + 48,
          backgroundColor: CARD_BG,
          borderRadius: 40,
          border: `1px solid ${BORDER_COLOR}`,
          boxShadow: SHADOW,
          overflow: "hidden",
        }}
      >
        {/* Accent top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: ACCENT_GRADIENT,
            zIndex: 10,
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
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: mapWidth * 0.8,
            height: mapHeight * 0.8,
            background: `radial-gradient(circle, rgba(232,108,0,${glowOpacity}), transparent 70%)`,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* 3D Map container */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            width: mapWidth,
            height: mapHeight,
            perspective,
            transform: `scale(${mapScale})`,
            zIndex: 3,
          }}
        >
          {/* Map surface */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transform: `rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`,
              transformStyle: "preserve-3d",
              background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
              borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Grid lines */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                borderRadius: 20,
              }}
            />

            {/* Buildings */}
            {buildingPositions.map((building, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: building.x,
                  top: building.y,
                  width: building.buildingWidth,
                  height: building.buildingHeight,
                  transform: `translateZ(${building.buildingHeight}px)`,
                  transformStyle: "preserve-3d",
                  background: ACCENT_GRADIENT,
                  borderRadius: 4,
                  boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
                }}
              >
                {/* Building top */}
                <div
                  style={{
                    position: "absolute",
                    top: -building.buildingHeight,
                    left: 0,
                    width: "100%",
                    height: building.buildingHeight,
                    background: ACCENT_GRADIENT,
                    borderRadius: 4,
                    transform: "rotateX(-90deg)",
                    transformOrigin: "bottom",
                  }}
                />
                {/* Building side */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: building.buildingHeight,
                    background: "#d35400",
                    transform: "rotateY(90deg)",
                    transformOrigin: "left",
                  }}
                />
              </div>
            ))}

            {/* Pin */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translateY(${pinY + pinFloat}px) scale(${pinScale}) rotate(${pinRotation}deg)`,
                zIndex: 5,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: ACCENT_COLOR,
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(45deg)",
                    width: 16,
                    height: 16,
                    background: "white",
                    borderRadius: "50%",
                  }}
                />
              </div>
            </div>

            {/* Ground shadow */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 60,
                height: 20,
                background: "rgba(0,0,0,0.2)",
                borderRadius: "50%",
                filter: "blur(4px)",
                zIndex: 4,
              }}
            />
          </div>
        </div>

        {/* Location label */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: `translateX(-50%) translateY(${labelY}px)`,
            opacity: labelOpacity,
            backgroundColor: "white",
            borderRadius: 20,
            padding: "12px 24px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 6,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>
            {locationName}
          </span>
          <span style={{ fontSize: 18, color: "#666" }}>
            {latitude.toFixed(2)}°N, {longitude.toFixed(2)}°E
          </span>
        </div>

        {/* Shimmer overlay */}
        {isIdle && (
          <div
            style={{
              position: "absolute",
              top: shimmerY,
              left: 0,
              right: 0,
              height: mapHeight * 0.18,
              background: "linear-gradient(180deg, rgba(232,108,0,0.2), transparent)",
              zIndex: 7,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Slider border */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 8,
            pointerEvents: "none",
          }}
        >
          <rect
            x={2}
            y={2}
            width={mapWidth + 44}
            height={mapHeight + 44}
            rx={40}
            ry={40}
            fill="none"
            stroke={SLIDER_BORDER_COLOR}
            strokeWidth={3}
            strokeDasharray={1000}
            strokeDashoffset={sliderDashOffset}
            style={{
              filter: "drop-shadow(0 0 20px rgba(26,26,26,0.15))",
            }}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
