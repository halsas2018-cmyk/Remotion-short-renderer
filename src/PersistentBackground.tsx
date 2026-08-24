import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Grid configuration
  const gridSize = 50;
  const lineColor = "#cbd5e1"; // slate-300
  const lineWidth = 1.5;

  // Diagonal drift speed (pixels per frame)
  const driftSpeed = 1.2;

  // Calculate offset based on frame - continuous, no reset
  const offsetX = (frame * driftSpeed) % gridSize;
  const offsetY = (frame * driftSpeed) % gridSize;

  // Number of lines needed to cover the screen with offset
  const numLinesX = Math.ceil(width / gridSize) + 2;
  const numLinesY = Math.ceil(height / gridSize) + 2;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
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
            }}
          />
        ))}
      </div>

      {/* Vignette overlay - transparent center, faint slate shadow at edges */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(226, 232, 240, 0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const BackgroundTestComposition: React.FC = () => (
  <Composition
    id="BackgroundTest"
    component={PersistentBackground}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
