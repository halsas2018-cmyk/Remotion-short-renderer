import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { fitText, measureText } from "@remotion/layout-utils";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

interface CompareSplitProps {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
  durationInFrames?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_COLOR_LIGHT = "#f97316";
const ACCENT_GLOW = "rgba(232, 108, 0, 0.4)";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_BORDER = "#e8e8e8";
const SLIDER_COLOR = "#1a1a1a";

const wrapLabel = (params: {
  text: string;
  maxWidth: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  fontWeight: 500 | 700;
}) => {
  const { text, maxWidth, maxLines, maxFontSize, minFontSize, fontWeight } = params;
  const fitted = fitText({
    text,
    withinWidth: maxWidth,
    fontFamily,
    fontWeight: String(fontWeight),
  });
  const fontSize = Math.max(minFontSize, Math.min(maxFontSize, fitted.fontSize));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const next = current ? `${current} ${words[i]}` : words[i];
    const { width: w } = measureText({
      text: next,
      fontFamily,
      fontSize,
      fontWeight: String(fontWeight),
    });
    if (w > maxWidth && current) {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines) {
        const remaining = words.slice(i).join(" ");
        const { width: rw } = measureText({
          text: remaining,
          fontFamily,
          fontSize,
          fontWeight: String(fontWeight),
        });
        if (rw > maxWidth) return { lines, didFit: false };
        return { lines: [...lines, remaining], didFit: true };
      }
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return { lines, fontSize, didFit: lines.length <= maxLines };
};

export const CompareSplit: React.FC<CompareSplitProps> = ({
  left,
  right,
  leftLabel,
  rightLabel,
  durationInFrames: propsDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // 30-40% entrance rule (non-text card)
  const leftDuration = Math.round(durationInFrames * 0.12);
  const rightStart = leftDuration + Math.round(durationInFrames * 0.03);
  const rightDuration = Math.round(durationInFrames * 0.12);
  const entranceEndFrame = rightStart + rightDuration;
  const sliderStart = entranceEndFrame;
  const sliderDuration = Math.round(durationInFrames * 0.40);

  const leftProgress = interpolate(frame, [0, leftDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rightProgress = interpolate(
    frame,
    [rightStart, rightStart + rightDuration],
    [0, 1],
    { easing: easeOutExpo, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const sliderProgress = interpolate(
    frame,
    [sliderStart, sliderStart + sliderDuration],
    [0, 1],
    { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const isIdle = frame > entranceEndFrame;
  const cardBounceOffset = isIdle
    ? Math.sin(frame * 0.08 * Math.PI * 2) * 6
    : 0;
  const cardTiltDeg = isIdle ? Math.sin(frame * 0.05) * 2 : 0;
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  const cardGap = Math.max(20, width * 0.02);
  const cardWidth = (availableWidth - cardGap) / 2;
  const cardHeight = Math.min(600, height * 0.5);
  const cardPadding = Math.max(40, width * 0.04);
  const cardBorderRadius = Math.max(28, width * 0.03);

  const sliderPadding = 24;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  const headlineMaxFontSize = Math.max(96, width * 0.085);
  const headlineMinFontSize = 48;
  const headlineMaxLines = 2;
  const headlineMaxWidth = cardWidth - 2 * cardPadding - 8;

  const leftHeadline = useMemo(
    () =>
      wrapLabel({
        text: left,
        maxWidth: headlineMaxWidth,
        maxLines: headlineMaxLines,
        maxFontSize: headlineMaxFontSize,
        minFontSize: headlineMinFontSize,
        fontWeight: 700,
      }),
    [left, headlineMaxWidth],
  );
  const rightHeadline = useMemo(
    () =>
      wrapLabel({
        text: right,
        maxWidth: headlineMaxWidth,
        maxLines: headlineMaxLines,
        maxFontSize: headlineMaxFontSize,
        minFontSize: headlineMinFontSize,
        fontWeight: 700,
      }),
    [right, headlineMaxWidth],
  );

  const resolveFinalFontSize = (fitted: {
    fontSize: number;
    lines: string[];
    didFit: boolean;
  }) => {
    let size = fitted.fontSize;
    while (size > headlineMinFontSize) {
      const longest = fitted.lines.reduce(
        (a, b) => (a.length >= b.length ? a : b),
        "",
      );
      const { width: lw } = measureText({
        text: longest,
        fontFamily,
        fontSize: size,
        fontWeight: "700",
      });
      if (lw <= headlineMaxWidth) break;
      size = Math.max(headlineMinFontSize, size - 4);
    }
    return size;
  };

  const leftFontSize = resolveFinalFontSize(leftHeadline);
  const rightFontSize = resolveFinalFontSize(rightHeadline);

  const shimmerStart = entranceEndFrame;
  const shimmerSpeed = 25;
  const getShimmerTop = (s: number) => {
    if (frame < s) return "-100%";
    const elapsedSeconds = (frame - s) / fps;
    return `${(elapsedSeconds * shimmerSpeed) % 100}%`;
  };
  const getShimmerOpacity = (s: number) => (frame < s ? 0 : 1);

  const AccentDot = ({ size = 8, baseDelay = 0 }: { size?: number; baseDelay?: number }) => {
    const pulse = isIdle ? 1 + 0.3 * Math.sin(frame * 0.2 + baseDelay) : 1;
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: ACCENT_COLOR,
          opacity: pulse,
        }}
      />
    );
  };

  const renderCard = (
    label: string | undefined,
    lines: string[],
    fontSize: number,
    progress: number,
    isLeft: boolean,
  ) => (
    <article
      style={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: cardBorderRadius,
        backgroundColor: "white",
        border: `1px solid ${CARD_BORDER}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: cardPadding,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        transformOrigin: "center",
        transform: [
          { scale: progress },
          { translateX: interpolate(progress, [0, 1], [isLeft ? -60 : 60, 0]) },
          { translateY: cardBounceOffset },
          { rotate: `x ${cardTiltDeg}deg` },
        ],
        opacity: progress,
        boxShadow: CARD_SHADOW,
        willChange: "transform, opacity",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${ACCENT_COLOR}, ${ACCENT_COLOR_LIGHT})`,
          borderRadius: `${cardBorderRadius}px ${cardBorderRadius}px 0 0`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <div
          style={{
            width: "110%",
            height: "110%",
            borderRadius: cardBorderRadius,
            background: `radial-gradient(ellipse at center, rgba(232, 108, 0, 0.25) 0%, transparent 70%)`,
            opacity: glowOpacity,
            filter: `blur(60px)`,
            scale: glowPulse,
          }}
        />
      </div>
      {label && (
        <div
          style={{
            fontSize: Math.max(20, width * 0.02),
            fontWeight: 700,
            color: MEDIUM_TEXT,
            fontFamily,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontSize,
          fontWeight: 700,
          color: DARK_TEXT,
          fontFamily,
          lineHeight: 1.18,
          letterSpacing: -1.5,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          maxWidth: "100%",
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {lines.map((line, i) => (
          <span key={i} style={{ display: "block", maxWidth: "100%" }}>
            {line}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16, pointerEvents: "none" }}>
        <AccentDot size={5} baseDelay={0.2} />
        <AccentDot size={6} baseDelay={0.7} />
        <AccentDot size={5} baseDelay={1.2} />
      </div>
      <div
        style={{
          position: "absolute",
          top: getShimmerTop(shimmerStart),
          left: 0,
          width: "100%",
          height: "18%",
          background: `linear-gradient(180deg, transparent, ${ACCENT_COLOR}33, transparent)`,
          opacity: getShimmerOpacity(shimmerStart),
          borderRadius: cardBorderRadius,
          pointerEvents: "none",
        }}
      />
    </article>
  );

  return (
    <AbsoluteFill style={{ width, height, backgroundColor: "transparent" }}>
      {/* Slider border around both cards */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding - sliderPadding,
          right: padding - sliderPadding,
          translate: "0px -50%",
          height: cardHeight + 2 * sliderPadding,
          pointerEvents: "none",
          border: `${sliderStrokeWidth}px solid ${SLIDER_COLOR}`,
          borderRadius: sliderBorderRadius,
          boxSizing: "border-box",
          opacity: sliderProgress,
          filter: "drop-shadow(0 0 20px rgba(26, 26, 26, 0.15))",
          scale: interpolate(
            frame,
            [sliderStart, sliderStart + sliderDuration],
            [0.96, 1],
            {
              easing: Easing.spring({ damping: 200 }),
              output: "perceptual-scale",
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          ),
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          translate: "0px -50%",
          width: availableWidth,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: cardGap,
        }}
      >
        {renderCard(leftLabel, leftHeadline.lines, leftFontSize, leftProgress, true)}
        {renderCard(rightLabel, rightHeadline.lines, rightFontSize, rightProgress, false)}
      </div>
    </AbsoluteFill>
  );
};

export const CompareSplitTestComposition: React.FC = () => (
  <Composition
    id="CompareSplitTest"
    component={CompareSplit}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      left: "$50M",
      right: "$75M",
      leftLabel: "Q1",
      rightLabel: "Q2",
    }}
  />
);
