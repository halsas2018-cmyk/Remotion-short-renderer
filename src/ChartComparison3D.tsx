import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { useSceneOrbit } from "./lib/sceneMotion";

interface ChartComparison3DProps {
  items: Array<{ label: string; value: number }>;
  durationInFrames?: number; // Optional override; defaults to composition duration
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_COLOR_LIGHT = "#f97316";
const ACCENT_GLOW = "rgba(232, 108, 0, 0.45)";
const DARK_TEXT = "#1a1a1a";
const SLIDER_COLOR = "#1a1a1a";

// ---- 3D stage tuning (cranked up so the depth is unmistakable) ----
const PERSPECTIVE = 1000;
const ENTRANCE_ROT_Y = -32; // scene starts swung far to one side...
const REST_ROT_Y = -10; // ...and settles to a resting angle
const ENTRANCE_ROT_X = 20; // looking down onto the floor at first...
const REST_ROT_X = 9; // ...then levels off
const IDLE_SWING_Y = 8; // idle orbit amplitude (degrees) — owned by useSceneOrbit
const IDLE_SWING_X = 2; // idle orbit amplitude (degrees) — owned by useSceneOrbit
const SCENE_BOB_FREQ = 0.05; // cycles per frame — stays as a local (translate, not rotate)
const SCENE_BOB_AMP_PX = 6; // px

// Winner bar = orange gradient, losers = neutral slate
const WINNER = {
  front: `linear-gradient(165deg, ${ACCENT_COLOR_LIGHT}, ${ACCENT_COLOR})`,
  right: "#c2410c",
  left: "#9a3412",
  top: "#fb923c",
  back: "#7c2d12",
};
const LOSER = {
  front: "linear-gradient(165deg, #94a3b8, #64748b)",
  right: "#475569",
  left: "#334155",
  top: "#cbd5e1",
  back: "#1e293b",
};

// Smart number formatting (K / M / B / T)
const formatValue = (v: number): string => {
  const abs = Math.abs(v);
  const trim = (n: number) => String(parseFloat(n.toFixed(1)));
  if (abs >= 1e12) return `$${trim(v / 1e12)}T`;
  if (abs >= 1e9) return `$${trim(v / 1e9)}B`;
  if (abs >= 1e6) return `$${trim(v / 1e6)}M`;
  if (abs >= 1e3) return `$${trim(v / 1e3)}K`;
  return `$${trim(v)}`;
};

export const ChartComparison3D: React.FC<ChartComparison3DProps> = ({
  items,
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  if (!items.length) {
    return <AbsoluteFill style={{ backgroundColor: "transparent" }} />;
  }

  // ============================================
  // INTERNAL TIMELINE — completes by ~75%, then holds
  // ============================================
  const sceneSettleDur = Math.round(durationInFrames * 0.16);
  const barGrowStart = Math.round(durationInFrames * 0.06);
  const barStagger = Math.round(durationInFrames * 0.05);
  const barGrowDur = Math.round(durationInFrames * 0.14);
  const valuePopDelay = Math.round(durationInFrames * 0.03);
  const sliderStart = Math.round(durationInFrames * 0.52);
  const sliderDuration = Math.round(durationInFrames * 0.3);

  const n = items.length;
  const maxValue = Math.max(...items.map((it) => it.value), 1);
  const winnerIndex = items.reduce(
    (best, it, i) => (it.value > items[best].value ? i : best),
    0
  );

  // Idle blends in smoothly once every bar has finished growing
  const barsDoneFrame = barGrowStart + (n - 1) * barStagger + barGrowDur;
  const idleBlend = interpolate(frame, [barsDoneFrame, barsDoneFrame + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ---- Scene camera: dramatic swing-in (owned by component), then idle orbit (owned by hook) ----
  const settleT = interpolate(frame, [0, sceneSettleDur], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceRotY = ENTRANCE_ROT_Y + (REST_ROT_Y - ENTRANCE_ROT_Y) * settleT;
  const entranceRotX = ENTRANCE_ROT_X + (REST_ROT_X - ENTRANCE_ROT_X) * settleT;
  const orbit = useSceneOrbit({
    idleBlend,
    swingYDeg: IDLE_SWING_Y,
    swingXDeg: IDLE_SWING_X,
  });
  const rotY = entranceRotY + orbit.rotationY;
  const rotX = entranceRotX + orbit.rotationX;
  // sceneBob stays as a local — it's a translateY, not a rotation, so it
  // doesn't belong in useSceneOrbit (which is rotations-only by design).
  const sceneBob = Math.sin(frame * SCENE_BOB_FREQ) * SCENE_BOB_AMP_PX * idleBlend;

  // ---- Geometry ----
  const padding = Math.max(80, width * 0.11);
  const stageW = width - 2 * padding;
  const stageH = Math.min(820, height * 0.42);
  const slot = stageW / n;
  const barW = Math.max(90, Math.min(slot * 0.42, 190));
  const depth = Math.max(60, Math.min(barW * 0.55, 110)); // extrusion thickness
  const halfD = depth / 2;
  const maxBarH = stageH * 0.62;
  const minBarH = 90;

  const sliderPadding = 24;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const barHeight = (value: number) =>
    minBarH + Math.pow(value / maxValue, 0.8) * (maxBarH - minBarH);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Soft accent backdrop glow — screen-space, sits behind the whole stage */}
      <div
        style={{
          position: "absolute",
          width: stageW * 1.1,
          height: stageH * 1.1,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.14) 0%, transparent 65%)`,
          filter: "blur(40px)",
          opacity: interpolate(frame, [0, sceneSettleDur], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Stage — perspective turns descendant Z into real depth */}
      <div
        style={{
          position: "relative",
          width: stageW,
          height: stageH,
          perspective: PERSPECTIVE,
          perspectiveOrigin: "center 60%",
        }}
      >
        {/* Slider border — screen-space UI frame, pops in around the stage */}
        <div
          style={{
            position: "absolute",
            inset: -sliderPadding,
            pointerEvents: "none",
            border: `${sliderStrokeWidth}px solid ${SLIDER_COLOR}`,
            borderRadius: 44,
            boxSizing: "border-box",
            opacity: interpolate(frame, [sliderStart, sliderStart + 10], [0, 1], {
              easing: easeOut,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [sliderStart, sliderStart + sliderDuration], [0.94, 1], {
              easing: Easing.spring({ damping: 200 }),
              output: "perceptual-scale",
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
          }}
        />

        {/* Scene — pivots at floor level, swings in then orbits */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 36,
            width: 0,
            height: 0,
            transformStyle: "preserve-3d",
            transform: `translateY(${sceneBob}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            willChange: "transform",
          }}
        >
          {/* Infinite-feel floor grid, fading at the edges */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: stageW * 1.7,
              height: 560,
              marginLeft: -(stageW * 1.7) / 2,
              marginTop: -280,
              transform: "rotateX(90deg)",
              backgroundImage: `
                repeating-linear-gradient(0deg, rgba(26,26,26,0.08) 0, rgba(26,26,26,0.08) 1px, transparent 1px, transparent 56px),
                repeating-linear-gradient(90deg, rgba(26,26,26,0.08) 0, rgba(26,26,26,0.08) 1px, transparent 1px, transparent 56px)
              `,
              WebkitMaskImage:
                "radial-gradient(closest-side, black 50%, transparent 100%)",
              maskImage: "radial-gradient(closest-side, black 50%, transparent 100%)",
            }}
          />

          {items.map((item, i) => {
            const H = barHeight(item.value);
            const isWinner = i === winnerIndex;
            const pal = isWinner ? WINNER : LOSER;

            // Growth window for this bar
            const barStart = barGrowStart + i * barStagger;
            const growth = interpolate(frame, [barStart, barStart + barGrowDur], [0, 1], {
              easing: easeOutExpo,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const g = Math.max(growth, 0.001);

            // Value label pops after the bar lands
            const valStart = barStart + barGrowDur + valuePopDelay;
            const valProgress = interpolate(frame, [valStart, valStart + 14], [0, 1], {
              easing: easeOutExpo,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            // Winner glow pulse during idle
            const winGlow =
              isWinner && idleBlend > 0
                ? `drop-shadow(0 0 ${10 + 6 * Math.sin(frame * 0.12)}px ${ACCENT_GLOW})`
                : "none";

            const x = (i - (n - 1) / 2) * slot;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: -barW / 2,
                  bottom: 0,
                  width: barW,
                  height: H,
                  transformStyle: "preserve-3d",
                  transform: `translateX(${x}px)`,
                }}
              >
                {/* Ground contact shadow — grows with the bar */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: -14,
                    width: barW * 1.35,
                    height: 28,
                    marginLeft: -(barW * 1.35) / 2,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)",
                    transform: `rotateX(90deg) translateZ(2px) scale(${Math.max(g, 0.3)})`,
                  }}
                />

                {/* Floor-painted label — lies flat on the ground, rotates with the scene */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "100%",
                    width: slot * 0.95,
                    marginLeft: -(slot * 0.95) / 2,
                    marginTop: 14,
                    transform: "rotateX(90deg) translateZ(4px)",
                    transformOrigin: "top center",
                    backfaceVisibility: "hidden",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 26px",
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.82)",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                      fontSize: Math.max(24, Math.min(slot * 0.085, 32)),
                      fontWeight: 700,
                      fontFamily:
                        "'Space Grotesk', 'Inter', system-ui, sans-serif",
                      color: DARK_TEXT,
                      whiteSpace: "nowrap",
                      letterSpacing: -0.5,
                      opacity: interpolate(frame, [barStart + 6, barStart + 20], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    {item.label}
                  </div>
                </div>

                {/* Bar cuboid — scales up from the floor */}
                <div
                  style={{
                    position: "relative",
                    width: barW,
                    height: H,
                    transformStyle: "preserve-3d",
                    transformOrigin: "bottom center",
                    transform: `scaleY(${g})`,
                  }}
                >
                  {/* FRONT — carries the value */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: `translateZ(${halfD}px)`,
                      background: pal.front,
                      borderRadius: "6px 6px 0 0",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      paddingTop: 18,
                      filter: winGlow,
                    }}
                  >
                    <span
                      style={{
                        fontSize: Math.max(38, Math.min(barW * 0.34, 58)),
                        fontWeight: 700,
                        fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
                        color: "#ffffff",
                        letterSpacing: -1,
                        textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                        opacity: valProgress,
                        translate: `0px ${(1 - valProgress) * 18}px`,
                      }}
                    >
                      {formatValue(item.value)}
                    </span>
                  </div>

                  {/* BACK */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: `translateZ(${-halfD}px) rotateY(180deg)`,
                      background: pal.back,
                      borderRadius: "6px 6px 0 0",
                    }}
                  />

                  {/* RIGHT SIDE */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: (barW - depth) / 2,
                      width: depth,
                      height: H,
                      transform: "rotateY(90deg)",
                      background: pal.right,
                    }}
                  />

                  {/* LEFT SIDE */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: (barW - depth) / 2,
                      width: depth,
                      height: H,
                      transform: "rotateY(-90deg)",
                      background: pal.left,
                    }}
                  />

                  {/* TOP CAP */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: (H - depth) / 2,
                      width: barW,
                      height: depth,
                      transform: "rotateX(90deg)",
                      background: pal.top,
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Test compositions ----

export const ChartComparison3DTestComposition: React.FC = () => (
  <Composition
    id="ChartComparison3DTest"
    component={ChartComparison3D}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      items: [
        { label: "Broadcom", value: 70000000000 },
        { label: "Nvidia", value: 500000000000 },
      ],
    }}
  />
);

export const ChartComparison3DThreeTest: React.FC = () => (
  <Composition
    id="ChartComparison3DThreeTest"
    component={ChartComparison3D}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      items: [
        { label: "Meta", value: 27000000000 },
        { label: "Google", value: 85000000000 },
        { label: "Microsoft", value: 310000000000 },
      ],
    }}
  />
);

export const ChartComparison3DFourTest: React.FC = () => (
  <Composition
    id="ChartComparison3DFourTest"
    component={ChartComparison3D}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      items: [
        { label: "Q1", value: 12000000000 },
        { label: "Q2", value: 18000000000 },
        { label: "Q3", value: 15000000000 },
        { label: "Q4", value: 27000000000 },
      ],
    }}
  />
);
