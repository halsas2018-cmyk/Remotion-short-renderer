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
  durationInFrames: number;
  exitDirection?: "up" | "down" | "left" | "right";
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ACCENT_COLOR = "#e86c00";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#4a4a4a";
const LIGHT_TEXT = "#6a6a6a";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)";
const MAP_FILL = "#f0f0f0";
const MAP_STROKE = "#d0d0d0";
const PIN_COLOR = ACCENT_COLOR;
const PIN_INNER = "white";

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
  durationInFrames,
  exitDirection = "up",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const entranceFrames = 15;
  const exitStart = durationInFrames - 15;

  const isEntrance = frame < entranceFrames;
  const isExit = frame > exitStart;
  const isIdle = !isEntrance && !isExit;

  // Entrance animation for whole component
  const entranceProgress = interpolate(frame, [0, entranceFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = entranceProgress;

  // Exit animation
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitTranslateY = interpolate(
    frame,
    [exitStart, durationInFrames],
    [0, exitDirection === "up" ? -60 : exitDirection === "down" ? 60 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitTranslateX = interpolate(
    frame,
    [exitStart, durationInFrames],
    [0, exitDirection === "left" ? -60 : exitDirection === "right" ? 60 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Map fade in
  const mapStart = entranceFrames;
  const mapDuration = 20;
  const mapProgress = interpolate(frame, [mapStart, mapStart + mapDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pin drop animation
  const pinStart = mapStart + mapDuration;
  const pinDuration = 25;
  const pinProgress = interpolate(frame, [pinStart, pinStart + pinDuration], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1), // bounce
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Label fade in
  const labelStart = pinStart + pinDuration - 10;
  const labelDuration = 15;
  const labelProgress = interpolate(frame, [labelStart, labelStart + labelDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Idle animation: subtle pin pulse
  const idlePulse = 1 + 0.05 * Math.sin(frame * 0.06);
  const idleFloat = 3 * Math.sin(frame * 0.04);

  const scale = isEntrance ? entranceScale : isExit ? exitScale : 1;
  const opacity = isEntrance ? entranceOpacity : isExit ? exitOpacity : 1;
  const translateX = isExit ? exitTranslateX : 0;
  const translateY = isExit ? exitTranslateY : 0;

  // Convert lat/long to map coordinates (approximate for our abstract map)
  // Map bounds roughly: lat -60 to 70, long -180 to 180
  // SVG viewBox: 0 0 1000 500
  const mapWidth = 800;
  const mapHeight = 400;
  const mapLeft = (width - mapWidth) / 2;
  const mapTop = (height - mapHeight) / 2; // Vertically centered in full frame

  // Normalize coordinates
  const normLong = (longitude + 180) / 360; // 0 to 1
  const normLat = (70 - latitude) / 130; // 0 to 1 (inverted)

  const pinX = mapLeft + normLong * mapWidth;
  const pinY = mapTop + normLat * mapHeight;

  const pinSize = 28;
  const pinDropHeight = -200;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
        position: "relative",
      }}
    >
      <div
        style={{
          transform: [
            { scale },
            { translateX },
            { translateY },
          ],
          opacity,
          transformOrigin: "center",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {/* Map container - elevated card */}
        <div
          style={{
            position: "absolute",
            left: mapLeft,
            top: mapTop,
            width: mapWidth,
            height: mapHeight,
            backgroundColor: "white",
            borderRadius: 24,
            boxShadow: CARD_SHADOW,
            overflow: "hidden",
            opacity: mapProgress,
            transformOrigin: "center",
            transform: [{ scale: mapProgress }],
          }}
        >
          {/* World Map SVG */}
          <svg
            width={mapWidth}
            height={mapHeight}
            viewBox="0 0 1000 500"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
            }}
          >
            <path
              d={WORLD_MAP_PATH}
              fill={MAP_FILL}
              stroke={MAP_STROKE}
              strokeWidth={2}
            />
          </svg>
        </div>

        {/* Pin */}
        <div
          style={{
            position: "absolute",
            left: pinX - pinSize / 2,
            top: pinY - pinSize - pinDropHeight * (1 - pinProgress) + (isIdle ? idleFloat : 0),
            transformOrigin: "bottom center",
            transform: [
              { scale: pinProgress * (isIdle ? idlePulse : 1) },
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
              boxShadow: "0 4px 20px rgba(232, 108, 0, 0.4)",
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
            }}
          >
            <div
              style={{
                fontSize: 32,
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
                fontSize: 16,
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
      </div>
    </AbsoluteFill>
  );
};

export const MapLocationTestComposition: React.FC = () => (
  <Composition
    id="MapLocationTest"
    component={MapLocation}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      locationName: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);
