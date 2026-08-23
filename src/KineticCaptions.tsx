import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { useBeatContext } from "./MotionGraphicsVideo";

interface Word {
  word: string;
  start: number;
  end: number;
}

interface KineticCaptionsProps {
  captionEnabledTypes: Set<string>;
  beats: Array<{ type: string; startFrame: number; durationInFrames: number }>;
  words?: Word[];
}

// ============================================
// CONFIGURATION — clean line captions at bottom
// ============================================
const CONFIG = {
  // Typography
  fontSize: 56,
  fontWeight: 700 as React.CSSProperties["fontWeight"],
  fontFamily: "system-ui, sans-serif",
  lineHeight: 1.3,
  wordGap: 12,

  // Animation
  transitionFrames: 3,
  transitionEasing: Easing.bezier(0.16, 1, 0.3, 1),

  // Highlight style for current word
  highlightColor: "#e86c00",
  highlightBgColor: "rgba(232, 108, 0, 0.12)",
  highlightPadding: "4px 8px",
  highlightBorderRadius: 8,

  // Fade for past words
  pastWordOpacity: 0.6,
  pastWordColor: "#4a4a4a",

  // Layout - bottom of screen
  bottomMargin: 180,
  maxWidth: "90%",
  paddingHorizontal: 80,

  // Colors
  textColor: "#1a1a1a",
  inactiveTextColor: "#4a4a4a",
} as const;

export const KineticCaptions: React.FC<KineticCaptionsProps> = ({
  captionEnabledTypes,
  beats,
  words: dynamicWords,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { currentBeatType } = useBeatContext();

  // Determine if captions should show for current beat
  const shouldShowCaptions = currentBeatType ? captionEnabledTypes.has(currentBeatType) : false;

  // Use dynamic words if provided
  const allWords: Word[] = React.useMemo(() => {
    if (dynamicWords && dynamicWords.length > 0) {
      return dynamicWords;
    }
    return [] as Word[];
  }, [dynamicWords]);

  if (!shouldShowCaptions || allWords.length === 0) {
    return null;
  }

  // Find the currently spoken word index
  const currentWordIndex = allWords.findIndex((w, i) => {
    const wordStartFrame = Math.round(w.start * fps);
    const nextWord = allWords[i + 1];
    const nextWordStartFrame = nextWord ? Math.round(nextWord.start * fps) : Math.round(w.end * fps);
    return frame >= wordStartFrame && frame < nextWordStartFrame;
  });

  // For each word, compute its visibility progress
  const wordStates = allWords.map((w, i) => {
    const wordStartFrame = Math.round(w.start * fps);
    const wordEndFrame = Math.round(w.end * fps);
    const nextWord = allWords[i + 1];
    const nextWordStartFrame = nextWord ? Math.round(nextWord.start * fps) : wordEndFrame;
    const fadeInFrames = CONFIG.transitionFrames;

    let progress = 0;
    let isCurrent = false;
    let currentProgress = 0;

    if (frame < wordStartFrame) {
      progress = 0;
    } else if (frame < wordStartFrame + fadeInFrames) {
      progress = interpolate(frame, [wordStartFrame, wordStartFrame + fadeInFrames], [0, 1], {
        easing: CONFIG.transitionEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (frame < nextWordStartFrame) {
      progress = 1;
    } else {
      progress = 1; // Stay visible after spoken
    }

    // Current word highlight
    if (i === currentWordIndex) {
      isCurrent = true;
      if (frame < wordStartFrame + fadeInFrames) {
        currentProgress = interpolate(frame, [wordStartFrame, wordStartFrame + fadeInFrames], [0, 1], {
          easing: CONFIG.transitionEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
      } else if (frame < nextWordStartFrame - fadeInFrames) {
        currentProgress = 1;
      } else {
        currentProgress = interpolate(frame, [nextWordStartFrame - fadeInFrames, nextWordStartFrame], [1, 0], {
          easing: CONFIG.transitionEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
      }
    }

    return {
      word: w,
      progress,
      isCurrent,
      currentProgress,
      index: i,
    };
  });

  // Only show words that have started (progress > 0) plus a few upcoming
  const visibleWords = wordStates
    .filter((s) => s.progress > 0 || (s.index <= currentWordIndex + 2 && s.index >= currentWordIndex - 10))
    .slice(-15); // Limit to last 15 words for performance

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: CONFIG.bottomMargin,
          left: CONFIG.paddingHorizontal,
          right: CONFIG.paddingHorizontal,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: CONFIG.wordGap,
          maxWidth: CONFIG.maxWidth,
          pointerEvents: "none",
        }}
      >
        {visibleWords.map(({ word: w, progress, isCurrent, currentProgress, index }) => {
          const isPast = index < currentWordIndex;
          const isFuture = index > currentWordIndex;

          // Word entrance animation
          const entranceProgress = interpolate(progress, [0, 1], [0, 1], {
            easing: Easing.bezier(0.34, 1.56, 0.64, 1), // subtle bounce
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const scale = interpolate(entranceProgress, [0, 1], [0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const opacity = isFuture ? 0 : progress;
          const yOffset = interpolate(entranceProgress, [0, 1], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Current word highlight pulse
          const highlightPulse = isCurrent ? 1 + 0.05 * Math.sin(frame * 0.15) : 1;

          // Styles based on state
          const baseStyles: React.CSSProperties = {
            display: "inline-block",
            fontSize: CONFIG.fontSize,
            fontWeight: CONFIG.fontWeight,
            fontFamily: CONFIG.fontFamily,
            lineHeight: CONFIG.lineHeight,
            whiteSpace: "nowrap",
            opacity,
            transform: `translateY(${yOffset}px) scale(${scale * highlightPulse})`,
            transformOrigin: "center bottom",
            transition: "none",
          };

          let wordStyles: React.CSSProperties = { ...baseStyles };

          if (isCurrent) {
            wordStyles = {
              ...wordStyles,
              color: CONFIG.highlightColor,
              backgroundColor: CONFIG.highlightBgColor,
              padding: CONFIG.highlightPadding,
              borderRadius: CONFIG.highlightBorderRadius,
              fontWeight: 800,
              boxShadow: `0 2px 12px rgba(232, 108, 0, ${0.2 * currentProgress})`,
            };
          } else if (isPast) {
            wordStyles = {
              ...wordStyles,
              color: CONFIG.pastWordColor,
              opacity: CONFIG.pastWordOpacity * progress,
            };
          } else {
            wordStyles = {
              ...wordStyles,
              color: CONFIG.textColor,
            };
          }

          return (
            <span
              key={`${w.start}-${w.word}-${index}`}
              style={wordStyles}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Test composition - loads timestamps.json for preview
export const KineticCaptionsComposition: React.FC = () => {
  const [words, setWords] = React.useState<Word[]>([]);
  
  React.useEffect(() => {
    fetch("../timestamps.json")
      .then(res => res.ok ? res.json() : [])
      .then(data => setWords(data))
      .catch(() => setWords([]));
  }, []);

  return (
    <Composition
      id="KineticCaptions"
      component={KineticCaptions}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        captionEnabledTypes: new Set([
          "chart_counter",
          "chart_comparison",
          "chart_line",
          "progress_meter",
          "map_location",
          "timeline",
          "process_flow",
          "versus",
          "icon_text",
          "quote_card",
          "before_after",
        ]),
        beats: [],
        words,
      }}
    />
  );
};

// Dynamic composition factory - create compositions with custom captions
export function createKineticCaptionsComposition(
  id: string,
  words: Word[],
  durationInFrames: number = 300
) {
  return () => (
    <Composition
      id={id}
      component={KineticCaptions}
      durationInFrames={durationInFrames}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        captionEnabledTypes: new Set([
          "chart_counter",
          "chart_comparison",
          "chart_line",
          "progress_meter",
          "map_location",
          "timeline",
          "process_flow",
          "versus",
          "icon_text",
          "quote_card",
          "before_after",
        ]),
        beats: [],
        words,
      }}
    />
  );
}
