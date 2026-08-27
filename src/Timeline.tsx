import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  delayRender,
  continueRender,
  cancelRender,
} from "remotion";
import { Lottie, LottieAnimationData } from "@remotion/lottie";

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

// Lottie icon map for timeline markers (optional decorative animation)
const TIMELINE_ICON_MAP: Record<string, string> = {
  "2024": "growth.json",
  "2025": "rocket.json",
  "2026": "chip.json",
  "2029": "money.json",
  "2032": "brain.json",
};

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
  const getDescPosition = (markerX: number) => {
    const halfCardWidth = descCardWidth / 2;
    let left = markerX - halfCardWidth;
    
    // Constrain to container bounds
    if (left < 0) {
      left = 0;
    } else if (left + descCardWidth > cardWidth) {
      left = cardWidth - descCardWidth;
    }
    
    return { left };
  };

  // Marker center Y position (above the center line)
  const markerCenterY = `calc(50% - ${labelOffset + markerRadius}px)`;
  // Description card top position (below the vertical line, not below the marker)
  // The vertical line goes from center line up to marker. We want the card to start
  // directly below the vertical line, i.e., at the center line (50%).
  const descCardTop = `calc(50% + ${markerRadius * 2 + 32}px)`;

  // Lottie loading for each marker (if icon exists)
  const lottieHandles = events.map((event) => {
    const iconFile = TIMELINE_ICON_MAP[event.marker];
    if (!iconFile) return null;
    return {
      iconFile,
      handle: delayRender(`Loading Lottie: ${iconFile}`),
    };
  });

  const [lottieData, setLottieData] = React.useState<Record<string, LottieAnimationData | null>>({});
  const [lottieFailed, setLottieFailed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const loaders = lottieHandles.filter(Boolean) as {
      iconFile: string;
      handle: number;
    }[];

    loaders.forEach(({ iconFile, handle }) => {
      fetch(`/icons/${iconFile}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load ${iconFile}`);
          return res.json();
        })
        .then((json) => {
          setLottieData((prev) => ({ ...prev, [iconFile]: json }));
          continueRender(handle);
        })
        .catch((err) => {
          console.warn(`Lottie icon not found: ${iconFile}`, err);
          setLottieFailed((prev) => ({ ...prev, [iconFile]: true }));
          continueRender(handle);
        });
    });

    // Cleanup: continue any remaining handles if component unmounts early
    return () => {
      loaders.forEach(({ handle }) => {
        // Only continue if not already continued (safe to call multiple times)
        try {
          continueRender(handle);
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: padding,
          right: padding,
          transform: `translateY(-50%) translateY(${cardBounceY}px)`,
          width: availableWidth,
          height: cardHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          willChange: "transform",
        }}
      >
        {/* Card container - explicit dimensions matching card outer size */}
        <div
          style={{
            position: "relative",
            width: cardWidth,
            height: cardHeight,
          }}
        >
          {/* Timeline content */}
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
            }}
          >
            {/* Horizontal line - draws from left to right */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: `${lineProgress * 100}%`,
                height: 3,
                background: `linear-gradient(90deg, ${LINE_COLOR}, ${ACCENT_COLOR}, ${LINE_COLOR})`,
                transformOrigin: "left center",
                transform: "translateY(-50%)",
                borderRadius: 2,
                opacity: lineProgress,
              }}
            />

            {/* Markers and labels */}
            {events.map((event, i) => {
              const xPos = getMarkerX(i);
              const markerProg = markerProgresses[i];
              const isActive = markerProg > 0;

              const descPos = getDescPosition(xPos);
              const iconFile = TIMELINE_ICON_MAP[event.marker];
              const lottieAnim = iconFile ? lottieData[iconFile] : null;
              const lottieFailedForIcon = iconFile ? lottieFailed[iconFile] : false;

              return (
                <React.Fragment key={i}>
                  {/* Vertical line from center line up to marker */}
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        left: xPos,
                        top: "50%",
                        width: 2,
                        height: labelOffset + markerRadius,
                        transformOrigin: "bottom center",
                        transform: [
                          { translateY: "-100%" },
                          { scaleY: markerProg },
                        ],
                        background: `linear-gradient(180deg, ${ACCENT_COLOR}, ${LINE_COLOR})`,
                        opacity: markerProg,
                      }}
                    />
                  )}

                  {/* Marker circle - elevated card style (shows the marker/year) */}
                  <div
                    style={{
                      position: "absolute",
                      left: xPos - markerRadius,
                      top: markerCenterY,
                      transform: [
                        { scale: markerProg * (isIdle ? idlePulse : 1) },
                      ],
                      transformOrigin: "center",
                      width: markerRadius * 2,
                      height: markerRadius * 2,
                      borderRadius: "50%",
                      backgroundColor: MARKER_BG,
                      border: `4px solid ${MARKER_BORDER}`,
                      opacity: markerProg,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 10,
                      boxShadow: `0 8px 32px rgba(232, 108, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)`,
                      willChange: "transform, opacity",
                    }}
                  >
                    {/* Lottie icon inside marker if available */}
                    {iconFile && lottieAnim && !lottieFailedForIcon ? (
                      <Lottie
                        animationData={lottieAnim}
                        style={{ width: markerRadius * 1.2, height: markerRadius * 1.2 }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: markerFontSize,
                          fontWeight: 800,
                          color: ACCENT_COLOR,
                          fontFamily: "system-ui, sans-serif",
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.marker}
                      </span>
                    )}
                  </div>

                  {/* Event description below vertical line - elevated card, centered under marker, constrained to screen */}
                  <div
                    style={{
                      position: "absolute",
                      left: descPos.left,
                      top: descCardTop,
                      width: descCardWidth,
                      textAlign: "center",
                      opacity: markerProg,
                      zIndex: 5,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: descCardBorderRadius,
                        padding: "18px 24px",
                        boxShadow: CARD_SHADOW,
                        transform: `scale(${markerProg})`,
                        transformOrigin: "top center",
                        border: `1px solid ${CARD_BORDER}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: labelFontSize,
                          fontWeight: 600,
                          color: DARK_TEXT,
                          fontFamily: "system-ui, sans-serif",
                          lineHeight: 1.35,
                        }}
                      >
                        {event.label}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Test compositions
export const TimelineTestComposition = () => {
  return (
    <Composition
      id="TimelineTest"
      component={Timeline}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2029", label: "Exposure could hit $370B" },
        ],
      }}
    />
  );
};

export const Timeline3EventsTest = () => {
  return (
    <Composition
      id="Timeline3EventsTest"
      component={Timeline}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
        ],
      }}
    />
  );
};

export const Timeline4EventsTest = () => {
  return (
    <Composition
      id="Timeline4EventsTest"
      component={Timeline}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
          { marker: "2032", label: "AI chip market matures" },
        ],
      }}
    />
  );
};

export const Timeline5EventsTest = () => {
  return (
    <Composition
      id="Timeline5EventsTest"
      component={Timeline}
      durationInFrames={210}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2025", label: "AI infrastructure boom begins" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
          { marker: "2032", label: "AI chip market matures" },
        ],
      }}
    />
  );
};
