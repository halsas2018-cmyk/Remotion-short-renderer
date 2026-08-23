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

interface Beat {
  words: Word[];
  start: number;
  end: number;
}

interface PositionedWord extends Word {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
}

interface KineticCaptionsProps {
  captionEnabledTypes: Set<string>;
  beats: Array<{ type: string; startFrame: number; durationInFrames: number }>;
  // Dynamic captions - if not provided, falls back to timestamps.json
  words?: Word[];
}

// ============================================
// CONFIGURATION — tweak these values easily
// ============================================
const CONFIG = {
  // Highlight appearance - elevated card style
  highlightStyle: "elevated" as "elevated" | "filled",
  highlightColor: "#FF8C00", // warm orange accent
  highlightBgColor: "rgba(255, 255, 255, 0.98)",
  highlightShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
  highlightPadding: 16,
  highlightBorderRadius: 12,

  // Beat grouping
  wordsPerBeat: { min: 3, max: 6 },
  beatBreakGap: 0.35,

  // Typography
  fontSize: 68,
  fontWeight: 800 as React.CSSProperties["fontWeight"],
  fontFamily: "system-ui, sans-serif",
  lineHeight: 1.2,
  wordGap: 8,
  maxWidth: "100%",

  // Animation
  transitionFrames: 4,
  transitionEasing: Easing.bezier(0.16, 1, 0.3, 1),

  // Scattered persistent captions - more structured
  maxVisibleItems: 5,
  fadeOutDelayFrames: 25,
  fadeOutDurationFrames: 50,
  positionMargin: 100,
  positionJitter: 0.08,
  baseRotationRange: 2,

  // Layout
  paddingHorizontal: 80,
  backgroundColor: "white",
  textColor: "#1a1a1a",
  inactiveTextColor: "#4a4a4a",
} as const;

// Deterministic pseudo-random (mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate structured position for a word index - organized in a flowing layout
function getWordPosition(index: number, totalWords: number, width: number, height: number): { x: number; y: number; rotation: number; scale: number; delay: number } {
  const rand = mulberry32(index * 1000 + 42);
  const margin = CONFIG.positionMargin;
  const usableWidth = width - 2 * margin;
  const usableHeight = height - 2 * margin;

  // Create a more organic, flowing layout using a spiral/flow pattern
  const angle = (index * 2.39996323) % (Math.PI * 2); // Golden angle for distribution
  const radius = 0.15 + (index / totalWords) * 0.35; // Spiral outward
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  const baseX = centerX + Math.cos(angle) * radius * Math.min(usableWidth, usableHeight);
  const baseY = centerY + Math.sin(angle) * radius * Math.min(usableWidth, usableHeight);

  // Add subtle jitter
  const jitterX = (rand() - 0.5) * 2 * usableWidth * CONFIG.positionJitter;
  const jitterY = (rand() - 0.5) * 2 * usableHeight * CONFIG.positionJitter;

  const rotation = (rand() - 0.5) * 2 * CONFIG.baseRotationRange;
  const scale = 0.85 + rand() * 0.2; // 0.85 to 1.05
  const delay = rand() * 0.3; // Staggered entrance

  return {
    x: Math.max(margin, Math.min(width - margin, baseX + jitterX)),
    y: Math.max(margin, Math.min(height - margin, baseY + jitterY)),
    rotation,
    scale,
    delay,
  };
}

// Group words into beats (configurable min/max words, break at pauses > beatBreakGap)
function groupIntoBeats(words: Word[]): Beat[] {
  const beats: Beat[] = [];
  let currentBeat: Word[] = [];
  let beatStart = words[0]?.start ?? 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const nextWord = words[i + 1];
    const gap = nextWord ? nextWord.start - word.end : 0;

    currentBeat.push(word);

    const shouldBreak =
      gap > CONFIG.beatBreakGap ||
      currentBeat.length >= CONFIG.wordsPerBeat.max ||
      i === words.length - 1;

    const wouldHaveTooFew = currentBeat.length < CONFIG.wordsPerBeat.min && i !== words.length - 1;

    if (shouldBreak && !wouldHaveTooFew && currentBeat.length > 0) {
      beats.push({
        words: [...currentBeat],
        start: beatStart,
        end: word.end,
      });
      currentBeat = [];
      if (nextWord) beatStart = nextWord.start;
    }
  }

  return beats;
}

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

  // Use dynamic words if provided, otherwise fall back to imported timestamps
  const allWords: Word[] = React.useMemo(() => {
    if (dynamicWords && dynamicWords.length > 0) {
      return dynamicWords;
    }
    return [] as Word[];
  }, [dynamicWords]);

  // Compute positions once (memoized via closure)
  const wordsWithPositions: PositionedWord[] = React.useMemo(() => {
    return allWords.map((w, i) => {
      const pos = getWordPosition(i, allWords.length, width, height);
      return { ...w, ...pos };
    });
  }, [allWords, width, height]);

  // For each word, compute its visibility progress (0 to 1)
  const wordStates = wordsWithPositions.map((w, i) => {
    const wordStartFrame = Math.round(w.start * fps);
    const wordEndFrame = Math.round(w.end * fps);
    const fadeInFrames = CONFIG.transitionFrames;
    const holdFrames = CONFIG.fadeOutDelayFrames;
    const fadeOutFrames = CONFIG.fadeOutDurationFrames;

    const fadeOutStartFrame = wordStartFrame + fadeInFrames + holdFrames;
    const fadeOutEndFrame = fadeOutStartFrame + fadeOutFrames;

    let progress = 0;
    let isActiveHighlight = false;
    let highlightProgress = 0;

    if (frame < wordStartFrame) {
      progress = 0;
    } else if (frame < wordStartFrame + fadeInFrames) {
      progress = interpolate(frame, [wordStartFrame, wordStartFrame + fadeInFrames], [0, 1], {
        easing: CONFIG.transitionEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (frame < fadeOutStartFrame) {
      progress = 1;
    } else if (frame < fadeOutEndFrame) {
      progress = interpolate(frame, [fadeOutStartFrame, fadeOutEndFrame], [1, 0], {
        easing: CONFIG.transitionEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else {
      progress = 0;
    }

    // Active highlight: word is currently being spoken
    const nextWord = allWords[i + 1];
    const nextWordStartFrame = nextWord ? Math.round(nextWord.start * fps) : wordEndFrame;
    const highlightTransitionFrames = CONFIG.transitionFrames;

    if (frame >= wordStartFrame && frame < nextWordStartFrame) {
      isActiveHighlight = true;
      if (frame < wordStartFrame + highlightTransitionFrames) {
        highlightProgress = interpolate(frame, [wordStartFrame, wordStartFrame + highlightTransitionFrames], [0, 1], {
          easing: CONFIG.transitionEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
      } else if (frame < nextWordStartFrame - highlightTransitionFrames) {
        highlightProgress = 1;
      } else {
        highlightProgress = interpolate(frame, [nextWordStartFrame - highlightTransitionFrames, nextWordStartFrame], [1, 0], {
          easing: CONFIG.transitionEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
      }
    } else {
      isActiveHighlight = false;
      highlightProgress = 0;
    }

    return {
      word: w,
      progress,
      isActiveHighlight,
      highlightProgress,
      index: i,
    };
  });

  // Filter to only words with progress > 0, sort by start time (most recent last)
  // Limit to maxVisibleItems most recent
  const visibleWords = wordStates
    .filter((s) => s.progress > 0)
    .sort((a, b) => a.word.start - b.word.start)
    .slice(-CONFIG.maxVisibleItems);

  if (!shouldShowCaptions || allWords.length === 0) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        // Transparent background so PersistentBackground grid shows through
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      {visibleWords.map(({ word: w, progress, isActiveHighlight, highlightProgress, index }) => {
        // Entrance animation with bounce
        const entranceProgress = interpolate(progress, [0, 1], [0, 1], {
          easing: Easing.bezier(0.34, 1.56, 0.64, 1), // bounce easing
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        
        const scale = interpolate(entranceProgress, [0, 1], [0.3 * w.scale, w.scale], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = progress;

        // Highlight scale/opacity for elevated card style
        const highlightScale = interpolate(highlightProgress, [0, 1], [0.95, 1.08], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const highlightOpacity = isActiveHighlight ? highlightProgress : 0;

        // Idle animation for visible words (subtle float)
        const idleFloatY = progress > 0.99 ? Math.sin(frame * 0.02 + index) * 3 : 0;
        const idleFloatX = progress > 0.99 ? Math.cos(frame * 0.015 + index) * 2 : 0;
        const idleRotation = progress > 0.99 ? Math.sin(frame * 0.01 + index) * 1.5 : 0;

        const getHighlightStyles = () => {
          if (CONFIG.highlightStyle === "elevated") {
            return {
              backgroundColor: CONFIG.highlightBgColor,
              padding: `${CONFIG.highlightPadding}px ${CONFIG.highlightPadding + 8}px`,
              borderRadius: CONFIG.highlightBorderRadius,
              color: isActiveHighlight ? CONFIG.highlightColor : CONFIG.textColor,
              boxShadow: isActiveHighlight ? CONFIG.highlightShadow : "0 2px 8px rgba(0, 0, 0, 0.06)",
              border: isActiveHighlight ? `2px solid ${CONFIG.highlightColor}` : "1px solid rgba(0, 0, 0, 0.06)",
            };
          } else {
            return {
              backgroundColor: "transparent",
              padding: 0,
              borderRadius: 0,
              color: CONFIG.textColor,
            };
          }
        };

        const highlightStyles = getHighlightStyles();

        return (
          <span
            key={`${w.start}-${w.word}-${index}`}
            style={{
              position: "absolute",
              left: w.x,
              top: w.y,
              transform: `translate(-50%, -50%) rotate(${w.rotation + idleRotation}deg) scale(${scale * highlightScale}) translate(${idleFloatX}px, ${idleFloatY}px)`,
              transformOrigin: "center",
              opacity,
              fontSize: CONFIG.fontSize,
              fontWeight: CONFIG.fontWeight,
              fontFamily: CONFIG.fontFamily,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: isActiveHighlight ? 10 : index,
              lineHeight: CONFIG.lineHeight,
              ...highlightStyles,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </AbsoluteFill>
  );
};

// Test composition - loads timestamps.json for preview
export const KineticCaptionsComposition: React.FC = () => {
  const [words, setWords] = React.useState<Word[]>([]);
  
  React.useEffect(() => {
    // Load timestamps.json dynamically
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
