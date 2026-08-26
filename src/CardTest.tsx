import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { Card } from "./Card";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

/**
 * Preview composition for the centralized 3D Card.
 * Watch: card flies in from beyond the borders, content sits recessed
 * inside it, then the card floats idly with a pulsing glow.
 */
export const Card3DTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Content reveals shortly after the card lands (entrance ≈ 27 frames)
  const outBezier = Easing.bezier(0.16, 1, 0.3, 1);
  const headP = interpolate(frame, [24, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outBezier,
  });
  const subP = interpolate(frame, [32, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outBezier,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f6" }}>
      <Card idleStartFrame={Math.round(fps * 1.1)}>
        <div
          style={{
            opacity: headP,
            translate: `0px ${(1 - headP) * 30}px`,
            fontFamily,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1,
            color: "#1a1a1a",
          }}
        >
          The gamble works while AI chips are{" "}
          <span style={{ color: "#e86c00", fontSize: 78 }}>scarce</span>
        </div>
        <div
          style={{
            opacity: subP,
            translate: `0px ${(1 - subP) * 24}px`,
            fontFamily,
            fontSize: 44,
            fontWeight: 500,
            color: "rgba(26, 26, 26, 0.62)",
          }}
        >
          Supply stays tight through 2026
        </div>
      </Card>
    </AbsoluteFill>
  );
};
