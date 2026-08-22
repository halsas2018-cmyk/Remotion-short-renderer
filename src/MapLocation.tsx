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
const MAP_COLOR = "rgba(255,255,255,0.15)";
const MAP_STROKE = "rgba(255,255,255,0.3)";
const PIN_COLOR = "#FFD700";
const PIN_SHADOW = "rgba(0,0,0,0.4)";
const TEXT_COLOR = "white";
const LABEL_COLOR = "rgba(255,255,255,0.7)";

// Simplified world map path (abstract silhouette)
const WORLD_MAP_PATH = `
  M 100 300
  Q 150 250 200 280
  Q 250 240 300 270
  Q 350 230 400 260
  Q 450 220 500 250
  Q 550 210 600 240
  Q 650 200 700 230
  Q 750 190 800 220
  Q 850 180 900 210
  L 900 500
  Q 850 520 800 500
  Q 750 480 700 510
  Q 650 530 600 500
  Q 550 480 500 510
  Q 450 530 400 500
  Q 350 480 300 510
  Q 250 530 200 500
  Q 150 480 100 510
  Z
  M 300 350
  Q 350 320 400 340
  Q 450 310 500 330
  Q 550 300 600 320
  L 600 450
  Q 550 470 500 450
  Q 450 430 400 460
  Q 350 480 300 450
  Z
  M 150 380
  Q 200 360 250 370
  L 250 420
  Q 200 430 150 420
  Z
  M 650 280
  Q 700 260 750 270
  L 750 320
  Q 700 330 650 320
  Z
  M 400 400
  Q 450 380 500 390
  L 500 430
  Q 450 440 400 430
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
  // SVG viewBox: 0 0 1000 600 (from path)
  const mapWidth = 800;
  const mapHeight = 480;
  const mapLeft = (width - mapWidth) / 2;
  const mapTop = (height - mapHeight) / 2 - 50;

  // Normalize coordinates
  const normLong = (longitude + 180) / 360; // 0 to 1
  const normLat = (70 - latitude) / 130; // 0 to 1 (inverted)

  const pinX = mapLeft + normLong * mapWidth;
  const pinY = mapTop + normLat * mapHeight;

  const pinSize = 24;
  const pinDropHeight = -200;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 120,
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
          position: "relative",
        }}
      >
        {/* World Map SVG */}
        <svg
          width={mapWidth}
          height={mapHeight}
          viewBox="0 0 1000 600"
          style={{
            position: "absolute",
            left: mapLeft,
            top: mapTop,
            opacity: mapProgress,
            transformOrigin: "center",
            transform: [{ scale: mapProgress }],
          }}
        >
          <path
            d={WORLD_MAP_PATH}
            fill={MAP_COLOR}
            stroke={MAP_STROKE}
            strokeWidth={2}
          />
        </svg>

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
              backgroundColor: PIN_SHADOW,
              position: "absolute",
              bottom: -pinSize * 0.2,
              left: "50%",
              transform: [{ translateX: -50 }, { scaleX: pinProgress }],
              opacity: pinProgress * 0.5,
            }}
          />
          {/* Pin body */}
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
              boxShadow: `0 4px 20px ${PIN_SHADOW}`,
            }}
          >
            <div
              style={{
                width: pinSize * 0.5,
                height: pinSize * 0.5,
                borderRadius: "50%",
                backgroundColor: "black",
                transform: [{ rotate: "-45deg" }],
              }}
            />
          </div>
        </div>

        {/* Location name label */}
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
              fontSize: 36,
              fontWeight: 800,
              color: TEXT_COLOR,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: -1,
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {locationName}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: LABEL_COLOR,
              fontFamily: "system-ui, sans-serif",
              marginTop: 4,
            }}
          >
            {latitude >= 0 ? latitude.toFixed(2) : Math.abs(latitude).toFixed(2)}°{latitude >= 0 ? "N" : "S"} 
            {longitude >= 0 ? longitude.toFixed(2) : Math.abs(longitude).toFixed(2)}°{longitude >= 0 ? "E" : "W"}
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
