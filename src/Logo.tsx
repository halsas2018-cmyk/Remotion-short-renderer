import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

/**
 * Placeholder 2D S-NEWS logo.
 *
 * The previous 3D voxel version used by PersistentBackground.tsx is no
 * longer present (it was removed when the 3D cuboid grid was refactored
 * out in commit 1fe02ad). This file re-introduces a simple, GPU-cheap
 * 2D logo so PersistentBackground can keep mounting it without breaking
 * the build.
 *
 * Visual: orange "S-NEWS" text in a rounded card, with a slow Y-axis
 * spin and a gentle bob driven by useCurrentFrame(). Sized via the
 * `size` prop (1 = full default, < 1 = smaller, > 1 = bigger) so the
 * caller can scale it without touching the inner geometry.
 *
 * Replace with the real voxel logo when it's ready.
 *
 * The file is exported as BOTH a named export (`Logo`) and a default
 * export so it can be imported either way without surprising rspack's
 * module resolver.
 */
export type LogoProps = {
  size?: number;
};

export const Logo: React.FC<LogoProps> = ({ size = 1 }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Scale relative to the composition width.
  const baseSize = Math.min(width * 0.32, 420);
  const boxSize = baseSize * size;

  // Slow rotation: full turn every 6 seconds at 30fps = 180 frames.
  const rotateY = interpolate(frame, [0, 180], [0, 360], {
    extrapolateRight: "clamp",
    easing: Easing.linear,
  });

  // Gentle vertical bob.
  const bob = Math.sin(frame * 0.05) * 6;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 64,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: boxSize,
          height: boxSize * 0.45,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          backgroundColor: "#ff7a18",
          boxShadow: "0 8px 24px rgba(255, 122, 24, 0.35)",
          translate: `0 ${bob}px`,
          // simulate Y-axis spin by scaling X between 1 and -1
          scale: `${Math.cos((rotateY * Math.PI) / 180)} 1`,
        }}
      >
        <span
          style={{
            color: "white",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 900,
            fontSize: boxSize * 0.22,
            letterSpacing: 2,
            userSelect: "none",
          }}
        >
          S-NEWS
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default Logo;
