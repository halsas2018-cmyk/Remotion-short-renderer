import React from "react";
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ------------------------------------------------------------------ */
/* Tokens — TEMPORARY locals.                                          */
/* Next step: extract to src/designSystem.ts and import from there     */
/* so every component shares one source of truth.                      */
/* ------------------------------------------------------------------ */
const ACCENT = "#e86c00";
const ACCENT_LIGHT = "#f97316";
const CARD_BORDER = "#e8e8e8";
const CARD_SHADOW =
  "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";

/** hex (#rrggbb) -> rgba() string */
const withAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export interface CardProps {
  children: React.ReactNode;
  /** Card width in px. Default: fills stage minus safe-area padding. */
  width?: number;
  /** Minimum height in px; the card grows with content. Default 400. */
  minHeight?: number;
  /** Inner padding in px. Default: responsive (max(48, width * 0.044)). */
  padding?: number;
  /** How deep the interior recedes behind the rim, px. Default: responsive. */
  depth?: number;
  /** Fly-in length in frames. Default: ~0.9s. */
  entranceDuration?: number;
  /** Frame where idle float + glow pulse begin. Default: right after entrance. */
  idleStartFrame?: number;
  /** Render the accent gradient trim along the top rim. */
  showTopBar?: boolean;
}

/**
 * Centralized 3D card base — an open-front CONTAINER.
 *
 * Anatomy (all inside a preserve-3d context):
 *   - The front face is an OPENING (no face plane), framed by the rim.
 *   - Four shaded walls slope from the rim edges down/back to a floor at
 *     translateZ(-depth):  top (brightest), bottom (darkest),
 *     left (medium), right (dark).
 *   - Children sit ON the floor, recessed inside the box.
 *   - An ambient-occlusion ring darkens the seam where walls meet the rim.
 *
 * Entrance: the whole container flies in from beyond the frame borders
 * toward the viewer with a rotational settle. Idle: gentle float, orbital
 * drift and a pulsing accent glow behind the box.
 *
 * All motion is driven by useCurrentFrame() — no self-running animations.
 */
export const Card: React.FC<CardProps> = ({
  children,
  width: widthProp,
  minHeight: minHeightProp,
  padding: paddingProp,
  depth: depthProp,
  entranceDuration: entranceDurationProp,
  idleStartFrame: idleStartFrameProp,
  showTopBar = true,
}) => {
  const frame = useCurrentFrame();
  const { width: videoWidth, fps } = useVideoConfig();

  /* ---------------- responsive defaults ---------------- */
  const cardWidth = widthProp ?? videoWidth - 2 * Math.max(80, videoWidth * 0.11);
  const minHeight = minHeightProp ?? 400;
  const padding = paddingProp ?? Math.max(48, videoWidth * 0.044);
  const borderRadius = Math.max(32, videoWidth * 0.03);
  const depth = depthProp ?? Math.max(44, videoWidth * 0.05);
  const enterDur = entranceDurationProp ?? Math.max(18, Math.round(fps * 0.9));
  const idleStartFrame = idleStartFrameProp ?? enterDur;
  const flightDistance = videoWidth * 0.95;
  const perspective = Math.round(videoWidth * 1.2);

  /* ---------------- entrance: fly in toward the viewer ---------------- */
  const spring = Easing.spring({ damping: 200 });
  const outBezier = Easing.bezier(0.16, 1, 0.3, 1);

  const z = interpolate(frame, [0, enterDur], [-flightDistance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: spring,
  });
  const rotX = interpolate(frame, [0, enterDur], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outBezier,
  });
  const rotY = interpolate(frame, [0, enterDur], [-11, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outBezier,
  });
  const opacity = interpolate(frame, [0, enterDur * 0.45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outBezier,
  });
  const blurPx = interpolate(frame, [0, enterDur * 0.7], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outBezier,
  });
  // Content settles onto the floor in sync with the landing (avoids a pop
  // when the entrance opacity/filter stop flattening the 3D context)
  const contentZ = interpolate(frame, [0, enterDur], [0, -depth], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outBezier,
  });

  /* ---------------- idle: float + drift + glow pulse ---------------- */
  const idleT = Math.max(0, frame - idleStartFrame);
  const idleBlend = interpolate(idleT, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const t = idleT / fps;
  const floatY = Math.sin(t * Math.PI * 2 * 0.45) * 7 * idleBlend;
  const driftX = Math.sin(t * Math.PI * 2 * 0.31 + 1.2) * 1.3 * idleBlend;
  const driftY = Math.cos(t * Math.PI * 2 * 0.26) * 1.7 * idleBlend;
  const glowPulse = idleBlend * (0.5 + 0.5 * Math.sin(t * Math.PI));
  const glowOpacity =
    interpolate(frame, [0, enterDur * 0.6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: outBezier,
    }) *
    (0.72 + 0.28 * glowPulse);

  /* ---------------- shared wall style ---------------- */
  const wallStyle: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
  };

  return (
    <Interactive.Div
      name="Card Stage"
      style={{
        perspective,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Interactive.Div
        name="Card Rig"
        style={{
          transformStyle: "preserve-3d",
          // Screen-space idle float via the individual `translate` property
          // (composes before `transform`, so the bob stays vertical)
          translate: floatY !== 0 ? `0px ${floatY}px` : undefined,
          // Order-sensitive chain (rotation must precede the Z push), which
          // individual properties can't express — see timing.md exception
          transform: `rotateX(${rotX + driftX}deg) rotateY(${
            rotY + driftY
          }deg) translateZ(${z}px)`,
          // Guard: opacity < 1 flattens preserve-3d, so only apply it while
          // fading in. Once opaque, the container interior goes fully live.
          opacity: opacity < 0.999 ? opacity : undefined,
        }}
      >
        {/* Accent glow hovering behind the container */}
        <div
          style={{
            position: "absolute",
            inset: "-10%",
            transform: "translateZ(-110px)",
            background: `radial-gradient(closest-side, ${withAlpha(
              ACCENT,
              0.4
            )}, transparent 70%)`,
            filter: "blur(36px)",
            opacity: glowOpacity,
            pointerEvents: "none",
          }}
        />

        {/* Box shell — the rim of the container (front face is open) */}
        <Interactive.Div
          name="Card Body"
          style={{
            position: "relative",
            width: cardWidth,
            minHeight,
            borderRadius,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
            transformStyle: "preserve-3d",
            // Guard: same flattening rule as opacity — blur only during entrance
            filter: blurPx > 0.05 ? `blur(${blurPx}px)` : undefined,
          }}
        >
          {/* ---- Interior floor (content stands on this) ---- */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius,
              transform: `translateZ(${-depth}px)`,
              background:
                "radial-gradient(120% 120% at 50% 30%, #ffffff 0%, #f6f6f6 55%, #ededed 100%)",
              boxShadow: "inset 0 0 60px rgba(26, 26, 26, 0.05)",
              pointerEvents: "none",
            }}
          />

          {/* ---- Four interior walls, rim -> floor ---- */}

          {/* Top wall: brightest (light from above) */}
          <div
            style={{
              ...wallStyle,
              top: 0,
              left: 0,
              width: "100%",
              height: depth,
              transformOrigin: "top",
              transform: "rotateX(-90deg)",
              background: "linear-gradient(to bottom, #ffffff, #ececec)",
            }}
          />

          {/* Bottom wall: darkest */}
          <div
            style={{
              ...wallStyle,
              bottom: 0,
              left: 0,
              width: "100%",
              height: depth,
              transformOrigin: "bottom",
              transform: "rotateX(90deg)",
              background: "linear-gradient(to bottom, #d8d8d8, #f0f0f0)",
            }}
          />

          {/* Left wall: medium */}
          <div
            style={{
              ...wallStyle,
              top: 0,
              left: 0,
              width: depth,
              height: "100%",
              transformOrigin: "left",
              transform: "rotateY(90deg)",
              background: "linear-gradient(to right, #f5f5f5, #e3e3e3)",
            }}
          />

          {/* Right wall: dark-medium */}
          <div
            style={{
              ...wallStyle,
              top: 0,
              right: 0,
              width: depth,
              height: "100%",
              transformOrigin: "right",
              transform: "rotateY(-90deg)",
              background: "linear-gradient(to left, #eeeeee, #d9d9d9)",
            }}
          />

          {/* ---- Recessed content, standing on the floor ---- */}
          <Interactive.Div
            name="Card Content"
            style={{
              position: "relative",
              padding,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: Math.max(16, videoWidth * 0.017),
              transform: `translateZ(${contentZ}px)`,
            }}
          >
            {children}
          </Interactive.Div>

          {/* ---- Ambient occlusion: darkens the seam where walls meet rim ---- */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius,
              transform: "translateZ(0.5px)",
              boxShadow: `inset 0 0 ${Math.round(
                borderRadius * 0.8
              )}px rgba(26, 26, 26, 0.13), inset 0 3px 8px rgba(26, 26, 26, 0.07)`,
              pointerEvents: "none",
            }}
          />

          {/* Accent trim along the top rim */}
          {showTopBar && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: Math.max(4, videoWidth * 0.0037),
                borderRadius: `${borderRadius}px ${borderRadius}px 0 0`,
                background: `linear-gradient(90deg, ${ACCENT_LIGHT}, ${ACCENT})`,
                transform: "translateZ(10px)",
              }}
            />
          )}
        </Interactive.Div>
      </Interactive.Div>
    </Interactive.Div>
  );
};
