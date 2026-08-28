import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { Logo } from "./Logo";

/* ------------------------------------------------------------------ */
/*  Tuning constants                                                  */
/*                                                                     */
/*  These speeds are tuned for short-form YouTube Shorts (~30-60s).   */
/* ------------------------------------------------------------------ */

const GRID_SPACING = 40; // pixels between grid lines
const SCROLL_SPEED = 1.2; // pixels per frame the grid drifts downward

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
        stroke="rgba(0, 0, 0, 0.25)"
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
        stroke="rgba(0, 0, 0, 0.25)"
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
          "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.18) 50%, rgba(0, 0, 0, 0) 100%)",
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

      {/* Animated 3D orange S-NEWS voxel logo */}
      <Logo size={1} />
    </AbsoluteFill>
  );
};
