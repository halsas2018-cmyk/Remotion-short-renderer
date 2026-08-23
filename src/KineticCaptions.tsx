import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Audio,
  interpolate,
  Easing,
} from "remotion";
import timestamps from "../timestamps.json";

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
}

// ============================================
// CONFIGURATION — tweak these values easily
// ============================================
const CONFIG = {
  // Highlight appearance
  highlightStyle: "outline" as "outline" | "filled",
  highlightColor: "white",
  highlightOutlineWidth: 4,
  highlightOutlineGap: 2,
  highlightPadding: 16,
  highlightBorderRadius: 8,

  // Beat grouping (kept for timing reference)
  wordsPerBeat: { min: 3, max: 5 },
  beatBreakGap: 0.3,

  // Typography
  fontSize: 72,
  fontWeight: 800 as React.CSSProperties["fontWeight"],
  fontFamily: "system-ui, sans-serif",
  lineHeight: 1.3,
  wordGap: 12,
  maxWidth: "100%",

  // Animation
  transitionFrames: 3, // fade-in frames
  transitionEasing: Easing.bezier(0.16, 1, 0.3, 1),

  // Scattered persistent captions
  maxVisibleItems: 4, // max words visible at once
  fadeOutDelayFrames: 30, // frames to hold at full opacity before fading (1 sec at 30fps)
  fadeOutDurationFrames: 60, // frames to fade out (2 sec at 30fps)
  positionMargin: 120, // px from edges
  positionJitter: 0.15, // 0-1, how much to vary from grid positions
  baseRotationRange: 3, // degrees, max base rotation per word

  // Layout
  paddingHorizontal: 80,
  backgroundColor: "black",
  textColor: "white",
  inactiveTextColor: "white",
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

// Generate deterministic position for a word index
function getWordPosition(index: number, totalWords: number, width: number, height: number): { x: number; y: number; rotation: number } {
  const rand = mulberry32(index * 1000 + 42);
  const margin = CONFIG.positionMargin;
  const usableWidth = width - 2 * margin;
  const usableHeight = height - 2 * margin;

  // Create a loose grid to avoid overlaps, then jitter
  const cols = 3;
  const rows = 3;
  const col = index % cols;
  const row = Math.floor(index / cols) % rows;

  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;

  const baseX = margin + col * cellWidth + cellWidth / 2;
  const baseY = margin + row * cellHeight + cellHeight / 2;

  const jitterX = (rand() - 0.5) * 2 * cellWidth * CONFIG.positionJitter;
  const jitterY = (rand() - 0.5) * 2 * cellHeight * CONFIG.positionJitter;

  const rotation = (rand() - 0.5) * 2 * CONFIG.baseRotationRange;

  return {
    x: Math.max(margin, Math.min(width - margin, baseX + jitterX)),
    y: Math.max(margin, Math.min(height - margin, baseY + jitterY)),
    rotation,
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

const beats = groupIntoBeats(timestamps as Word[]);
const allWords = timestamps as Word[];
const lastWordEnd = allWords[allWords.length - 1]?.end ?? 0;
const BUFFER_SECONDS = 1;

// Pre-compute positions for all words (module level - will be recomputed in component)
const positionedWords: PositionedWord[] = allWords.map((w, i) => {
  return { ...w, x: 0, y: 0, rotation: 0 };
});

export const KineticCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Compute positions once (memoized via closure)
  const wordsWithPositions: PositionedWord[] = React.useMemo(() => {
    return allWords.map((w, i) => {
      const pos = getWordPosition(i, allWords.length, width, height);
      return { ...w, ...pos };
    });
  }, [width, height]);

  // For each word, compute its visibility progress (0 to 1)
  // Word fades in at start, holds, then fades out after delay
  // Only maxVisibleItems most recent words are kept visible
  const wordStates = wordsWithPositions.map((w, i) => {
    const wordStartFrame = Math.round(w.start * fps);
    const wordEndFrame = Math.round(w.end * fps);
    const fadeInFrames = CONFIG.transitionFrames;
    const holdFrames = CONFIG.fadeOutDelayFrames;
    const fadeOutFrames = CONFIG.fadeOutDurationFrames;

    // When does this word start fading out?
    const fadeOutStartFrame = wordStartFrame + fadeInFrames + holdFrames;
    const fadeOutEndFrame = fadeOutStartFrame + fadeOutFrames;

    let progress = 0;
    let isActiveHighlight = false;
    let highlightProgress = 0;

    if (frame < wordStartFrame) {
      progress = 0;
    } else if (frame < wordStartFrame + fadeInFrames) {
      // Fade in
      progress = interpolate(frame, [wordStartFrame, wordStartFrame + fadeInFrames], [0, 1], {
        easing: CONFIG.transitionEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (frame < fadeOutStartFrame) {
      // Fully visible
      progress = 1;
    } else if (frame < fadeOutEndFrame) {
      // Fade out
      progress = interpolate(frame, [fadeOutStartFrame, fadeOutEndFrame], [1, 0], {
        easing: CONFIG.transitionEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else {
      progress = 0;
    }

    // Active highlight: word is currently being spoken
    // Highlight from word start until next word start (or word end if last)
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CONFIG.backgroundColor,
        width,
        height,
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("narration.mp3")} />

      {visibleWords.map(({ word: w, progress, isActiveHighlight, highlightProgress, index }) => {
        const scale = interpolate(progress, [0, 1], [0.8, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = progress;

        // Highlight scale/opacity
        const highlightScale = interpolate(highlightProgress, [0, 1], [0.95, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const highlightOpacity = isActiveHighlight ? highlightProgress : 0;

        const getHighlightStyles = () => {
          if (CONFIG.highlightStyle === "filled") {
            return {
              backgroundColor: isActiveHighlight ? CONFIG.highlightColor : "transparent",
              padding: `0 ${CONFIG.highlightPadding}px`,
              borderRadius: CONFIG.highlightBorderRadius,
              color: isActiveHighlight ? CONFIG.backgroundColor : CONFIG.textColor,
              boxShadow: "none",
            };
          } else {
            const outlineOpacity = highlightOpacity;
            const outlineScale = interpolate(highlightProgress, [0, 1], [0.8, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return {
              backgroundColor: "transparent",
              padding: 0,
              borderRadius: 0,
              color: CONFIG.textColor,
              boxShadow: outlineOpacity > 0
                ? `0 0 0 ${CONFIG.highlightOutlineWidth * outlineScale}px ${CONFIG.highlightColor}, 0 0 0 ${(CONFIG.highlightOutlineWidth + CONFIG.highlightOutlineGap) * outlineScale}px ${CONFIG.backgroundColor}`
                : "none",
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
              transform: `translate(-50%, -50%) rotate(${w.rotation}deg) scale(${scale * highlightScale})`,
              transformOrigin: "center",
              opacity,
              fontSize: CONFIG.fontSize,
              fontWeight: CONFIG.fontWeight,
              fontFamily: CONFIG.fontFamily,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: isActiveHighlight ? 10 : index, // active on top
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

const durationInFrames = Math.round((lastWordEnd + BUFFER_SECONDS) * 30);

export const KineticCaptionsComposition: React.FC = () => (
  <Composition
    id="KineticCaptions"
    component={KineticCaptions}
    durationInFrames={durationInFrames}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
