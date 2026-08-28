import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
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

const GRID_SPACING = 40; // pixels between grid lines
const SCROLL_SPEED = 1.2; // pixels per frame the grid drifts downward

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

/**
 * A 2D gridline layer that scrolls downward continuously, giving a
 * subtle "moving background" feel without any GPU cost.
 *
 * Drawn as an SVG with a vertical offset driven by useCurrentFrame()
 * inside a translateY transform — the SVG is twice as tall as the
 * viewport so it tiles seamlessly as it scrolls.
 */
const ScrollingGrid2D: React.FC<{
  width: number;
  height: number;
  offsetPx: number;
}> = ({ width, height, offsetPx }) => {
  // Two full screens of vertical extent so the grid can wrap.
  const totalH = height * 2;
  const vCount = Math.ceil(width / GRID_SPACING) + 1;
  const hCount = Math.ceil(totalH / GRID_SPACING) + 1;

  const lines: React.ReactElement[] = [];

  // Vertical lines (span the full double-height area).
  for (let i = 0; i < vCount; i++) {
    const x = i * GRID_SPACING;
    lines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={totalH}
        stroke="rgba(0, 0, 0, 0.08)"
        strokeWidth={1}
      />,
    );
  }

  // Horizontal lines (two full screens' worth, stacked).
  for (let i = 0; i < hCount; i++) {
    const y = i * GRID_SPACING;
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
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <svg
        width={width}
        height={totalH}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          translate: `0 ${offsetPx}px`,
        }}
      >
        {lines}
      </svg>
    </div>
  );
};

/**
 * A thin horizontal rule that sweeps across the screen at a fixed
 * cadence, giving the background a sense of motion in addition to
 * the scrolling grid.
 */
const SweepLine: React.FC<{
  width: number;
  height: number;
  frame: number;
  periodFrames: number;
}> = ({ width, height, frame, periodFrames }) => {
  // Linear position: 0 -> 1 across the period, then resets.
  const raw = (frame % periodFrames) / periodFrames;

  // Use interpolate to keep the value stable and keyframeable.
  const y = interpolate(raw, [0, 1], [-40, height + 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height: y,
        background:
          "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.06) 50%, rgba(0, 0, 0, 0) 100%)",
        pointerEvents: "none",
      }}
    />
  );
};

export const PersistentBackground: React.FC = () => {
  const { width, height } = useVideoConfig();
  // This component is mounted at the ROOT of the composition, OUTSIDE
  // any <Sequence>, so `useCurrentFrame()` returns the GLOBAL composition
  // frame. This is what makes the grid and logo animate continuously
  // across the whole video instead of restarting at 0 every beat.
  const frame = useCurrentFrame();

  // Continuous downward scroll, wraps every (GRID_SPACING / SCROLL_SPEED)
  // frames so the grid appears infinitely tiled.
  const scrollOffset = (frame * SCROLL_SPEED) % GRID_SPACING;

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
      {/* 2D scrolling gridlines (pure SVG, no WebGL cost) */}
      <ScrollingGrid2D
        width={width}
        height={height}
        offsetPx={scrollOffset}
      />

      {/* Occasional horizontal sweep for a sense of motion */}
      <SweepLine
        width={width}
        height={height}
        frame={frame}
        periodFrames={120}
      />

      {/* 3D cuboid grid (105 cubes, half the original 203). */}
      <ThreeCanvas width={width} height={height}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        {cuboids}
      </ThreeCanvas>

      {/* Animated 3D orange S-NEWS voxel logo */}
      <Logo size={1} />
    </AbsoluteFill>
  );
};
