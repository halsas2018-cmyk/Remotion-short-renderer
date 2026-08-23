import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Grid configuration - made much more visible
  const gridSize = 60; // tighter spacing for more lines
  const lineOpacity = 0.4; // 40% opacity - clearly visible
  const lineColor = "#000000"; // pure black
  const lineWidth = 2; // thicker lines

  // Diagonal drift speed (pixels per frame) - increased for faster, more noticeable motion
  const driftSpeedX = 0.6;
  const driftSpeedY = 0.4;

  // Calculate offset based on frame - continuous, no reset
  const offsetX = (frame * driftSpeedX) % gridSize;
  const offsetY = (frame * driftSpeedY) % gridSize;

  // Number of lines needed to cover the screen with offset
  const numLinesX = Math.ceil(width / gridSize) + 2;
  const numLinesY = Math.ceil(height / gridSize) + 2;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* Vertical grid lines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {Array.from({ length: numLinesX }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(${i} * ${gridSize}px - ${offsetX}px)`,
              top: 0,
              width: `${lineWidth}px`,
              height: "100%",
              backgroundColor: lineColor,
              opacity: lineOpacity,
            }}
          />
        ))}
      </div>

      {/* Horizontal grid lines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {Array.from({ length: numLinesY }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `calc(${i} * ${gridSize}px - ${offsetY}px)`,
              left: 0,
              height: `${lineWidth}px`,
              width: "100%",
              backgroundColor: lineColor,
              opacity: lineOpacity,
            }}
          />
        ))}
      </div>

      {/* Subtle vignette for depth - slightly stronger */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.05) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const BackgroundTestComposition: React.FC = () => (
  <Composition
    id="BackgroundTest"
    component={PersistentBackground}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
