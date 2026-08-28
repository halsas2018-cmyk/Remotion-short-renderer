import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Logo } from "./Logo";

/* ------------------------------------------------------------------ */
/*  Tuning constants                                                  */
/*                                                                     */
/*  These speeds are tuned for short-form YouTube Shorts (~30-60s).   */
/*  Speeds are in radians per frame, so at 30 fps a value of 0.02    */
/*  means a full rotation every ~10.5 seconds.                        */
/* ------------------------------------------------------------------ */

const MAIN_CUBOID_ROTATION_SPEED = 0.02; // ~10.5s per full rotation
const INTERSECT_CUBOID_ROTATION_SPEED = 0.035; // faster, ~6s per full rotation
const CUBOID_ROTATION_SPEED_RATIO_Y = 1.3; // Y axis spins 1.3x faster than X

const SmallCuboid: React.FC<{
  position: [number, number, number];
  size: number;
  frame: number;
  rotationSpeed: number;
}> = ({ position, size, frame, rotationSpeed }) => {
  const rotationX = frame * rotationSpeed;
  const rotationY = frame * rotationSpeed * CUBOID_ROTATION_SPEED_RATIO_Y;

  return (
    <mesh position={position} rotation={[rotationX, rotationY, 0]}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color="#000000"
        emissive="#000000"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

const Gridlines2D: React.FC<{
  width: number;
  height: number;
}> = ({ width, height }) => {
  const spacing = 40;
  const lines: React.ReactElement[] = [];

  // Vertical lines
  const vCount = Math.ceil(width / spacing) + 1;
  for (let i = 0; i < vCount; i++) {
    const x = i * spacing;
    lines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="rgba(0, 0, 0, 0.08)"
        strokeWidth={1}
      />,
    );
  }

  // Horizontal lines
  const hCount = Math.ceil(height / spacing) + 1;
  for (let i = 0; i < hCount; i++) {
    const y = i * spacing;
    lines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="rgba(0, 0, 0, 0.08)"
        strokeWidth={1}
      />,
    );
  }

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    >
      {lines}
    </svg>
  );
};

export const PersistentBackground: React.FC = () => {
  const { width, height } = useVideoConfig();
  // This component is mounted at the ROOT of the composition, OUTSIDE
  // any <Sequence>, so `useCurrentFrame()` returns the GLOBAL composition
  // frame. This is what makes the cubes and logo animate continuously
  // across the whole video instead of resetting every beat.
  const frame = useCurrentFrame();

  // Halved grid: 6 cols x 10 rows = 60 main + 5x9 = 45 intersection = 105 total.
  // Spacing is increased to keep visual coverage roughly the same as the
  // previous 8x14 layout.
  const cols = 6;
  const rows = 10;
  const xSpacing = 0.7;
  const ySpacing = 0.7;
  const xStart = -((cols - 1) / 2) * xSpacing;
  const yStart = -((rows - 1) / 2) * ySpacing;

  const cuboids: React.ReactElement[] = [];

  // Main grid cuboids
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = xStart + col * xSpacing;
      const y = yStart + row * ySpacing;
      cuboids.push(
        <SmallCuboid
          key={`main-${row}-${col}`}
          position={[x, y, 0]}
          size={0.18}
          frame={frame}
          rotationSpeed={MAIN_CUBOID_ROTATION_SPEED}
        />,
      );
    }
  }

  // Smaller cuboids at each intersection (between every 4 main cuboids)
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const x = xStart + (col + 0.5) * xSpacing;
      const y = yStart + (row + 0.5) * ySpacing;
      cuboids.push(
        <SmallCuboid
          key={`intersect-${row}-${col}`}
          position={[x, y, 0]}
          size={0.1}
          frame={frame}
          rotationSpeed={INTERSECT_CUBOID_ROTATION_SPEED}
        />,
      );
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
        overflow: "hidden",
        translate: "0px 38.8px",
      }}
    >
      {/* 2D gridline layer (behind 3D cubes) */}
      <Gridlines2D width={width} height={height} />

      <ThreeCanvas width={width} height={height}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        {cuboids}
      </ThreeCanvas>

      {/* Animated 3D orange S-NEWS logo at top center */}
      <Logo size={1} />
    </AbsoluteFill>
  );
};
