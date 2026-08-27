import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface TimelineEvent {
  marker: string;
  label: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  durationInFrames?: number;
  lineDurPct?: number;
  markerStaggerPct?: number;
  markerDurPct?: number;
  sliderDurPct?: number;
}

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutExpo = Easing.bezier(0.19, 1, 0.22, 1);
const ACCENT_COLOR = "#e86c00";
const ACCENT_LIGHT = "#fff4ed";
const DARK_TEXT = "#1a1a1a";
const MEDIUM_TEXT = "#525252";
const LIGHT_TEXT = "#a3a3a3";
const CARD_SHADOW = "0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)";
const CARD_SHADOW_HOVER = "0 20px 50px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08)";
const LINE_COLOR = "#d0d0d0";
const MARKER_BG = "white";
const MARKER_BORDER = ACCENT_COLOR;
const SLIDER_COLOR = "#1a1a1a";
const CARD_BORDER = "#e8e8e8";

export const Timeline: React.FC<TimelineProps> = ({
  events,
  durationInFrames: propsDurationInFrames,
  lineDurPct = 0.15,
  markerStaggerPct = 0.04,
  markerDurPct = 0.10,
  sliderDurPct = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: videoDurationInFrames } = useVideoConfig();

  const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

  // ============================================
  // INTERNAL TIMELINE — completes by ~30%, then holds
  // No exit animation — designed to be wrapped by SceneTransition
  // ============================================
  const lineDuration = Math.round(durationInFrames * lineDurPct);
  const markerStagger = Math.round(durationInFrames * markerStaggerPct);
  const markerDuration = Math.round(durationInFrames * markerDurPct);
  const lineStart = 0;
  const markersStart = lineStart + lineDuration;
  const lastMarkerStart = markersStart + (events.length - 1) * markerStagger;
  const markersEnd = lastMarkerStart + markerDuration;
  const sliderStart = markersEnd;
  const sliderDuration = Math.round(durationInFrames * sliderDurPct);

  // Progress animations
  const lineProgress = interpolate(frame, [lineStart, lineStart + lineDuration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const markerProgresses = events.map((_, i) => {
    const markerStart = markersStart + i * markerStagger;
    return interpolate(frame, [markerStart, markerStart + markerDuration], [0, 1], {
      easing: easeOutExpo,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Idle pulse — time-based
  const allAnimationsDone = markersEnd;
  const isIdle = frame > allAnimationsDone;
  const idleTimeSeconds = (frame - allAnimationsDone) / fps;
  const idlePulse = isIdle ? 1 + 0.015 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 1;

  // Card bounce animation (idle) - 6px vertical bounce matching other components
  const cardBounceY = isIdle ? 6 * Math.sin(idleTimeSeconds * 2 * Math.PI * 0.4) : 0;

  // Glow pulse animation (idle)
  const glowPulse = isIdle ? 1 + 0.15 * Math.sin(frame * 0.03) : 1;
  const glowOpacity = isIdle ? 0.6 + 0.2 * Math.sin(frame * 0.05) : 0.5;

  // Responsive sizing
  const padding = Math.max(80, width * 0.11);
  const availableWidth = width - 2 * padding;
  
  // Larger marker radius to accommodate year text (4 digits need more space)
  const markerRadius = Math.max(36, width * 0.033);
  const labelOffset = Math.max(100, height * 0.05);
  const cardHeight = Math.min(520, height * 0.48);

  // Card dimensions (for slider and card styling)
  const cardWidth = availableWidth;
  const cardBorderRadius = Math.max(28, width * 0.026);
  const sliderPadding = 24;
  const sliderWidth = cardWidth + 2 * sliderPadding;
  const sliderHeight = cardHeight + 2 * sliderPadding;
  const sliderBorderRadius = cardBorderRadius + sliderPadding;
  const sliderStrokeWidth = Math.max(5, width * 0.0045);

  // Responsive font sizes (following video-layout.md minimums)
  const markerFontSize = Math.max(24, markerRadius * 0.55);
  const yearFontSize = Math.max(32, width * 0.03);
  const labelFontSize = Math.max(28, width * 0.026);
  const descCardBorderRadius = Math.max(16, width * 0.015);

  // Calculate marker X positions (evenly distributed)
  const getMarkerX = (index: number) => {
    if (events.length === 1) return cardWidth / 2;
    return (index / (events.length - 1)) * cardWidth;
  };

  // Description card width (responsive, based on number of events and available space)
  const descCardWidth = Math.min(
    cardWidth / Math.max(events.length, 2) * 0.9,
    340
  );

  // Calculate description card position - centered under marker, constrained to container
  const getDescPosition = (markerX: number