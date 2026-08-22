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

// ============================================
// CONFIGURATION — tweak these values easily
// ============================================
const CONFIG = {
  // Highlight appearance
  highlightStyle: "outline" as "outline" | "filled", // "outline" = border box, "filled" = solid background
  highlightColor: "white",
  highlightOutlineWidth: 4, // px (for outline style)
  highlightOutlineGap: 2, // px gap between text and outline (for outline style)
  highlightPadding: 16, // horizontal padding for filled style
  highlightBorderRadius: 8, // px

  // Beat grouping
  wordsPerBeat: { min: 3, max: 5 },
  beatBreakGap: 0.3, // seconds — break beat if pause between words exceeds this

  // Typography
  fontSize: 72,
  fontWeight: 800 as React.CSSProperties["fontWeight"],
  fontFamily: "system-ui, sans-serif",
  lineHeight: 1.3,
  wordGap: 12, // px between words
  maxWidth: "100%",

  // Animation
  transitionFrames: 3, // frames for fade/scale transition
  transitionEasing: Easing.bezier(0.16, 1, 0.3, 1),

  // Layout
  paddingHorizontal: 80,
  backgroundColor: "black",
  textColor: "white",
  inactiveTextColor: "white", // same as textColor by default
} as const;

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

    // Break beat if: gap > threshold OR beat has max words OR it's the last word
    const shouldBreak =
      gap > CONFIG.beatBreakGap ||
      currentBeat.length >= CONFIG.wordsPerBeat.max ||
      i === words.length - 1;

    // Also enforce minimum words per beat (don't break if we'd have too few)
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
const lastWordEnd = timestamps[timestamps.length - 1]?.end ?? 0;
const BUFFER_SECONDS = 1;

export const KineticCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Find current beat
  let currentBeat: Beat | null = null;
  for (const beat of beats) {
    const beatStartFrame = Math.round(beat.start * fps);
    const beatEndFrame = Math.round(beat.end * fps);
    if (frame >= beatStartFrame && frame < beatEndFrame) {
      currentBeat = beat;
      break;
    }
  }

  if (!currentBeat) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: CONFIG.backgroundColor,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${CONFIG.paddingHorizontal}px`,
          width,
          height,
        }}
      >
        <Audio src={staticFile("narration.mp3")} />
      </AbsoluteFill>
    );
  }

  // For each word, compute its highlight progress (0 to 1) based on frame distance from word start
  // A word becomes active at its start frame, transitions in over transitionFrames,
  // stays at 1 until the NEXT word's start frame, then transitions out over transitionFrames
  const wordHighlights = currentBeat.words.map((w, i) => {
    const wordStartFrame = Math.round(w.start * fps);
    const nextWord = currentBeat.words[i + 1];
    const nextWordStartFrame = nextWord ? Math.round(nextWord.start * fps) : Math.round(w.end * fps);
    const transitionFrames = CONFIG.transitionFrames;

    // Progress: 0 before word starts, ramps to 1 over transitionFrames, stays 1 until next word starts, ramps to 0
    let progress = 0;
    if (frame < wordStartFrame) {
      progress = 0;
    } else if (frame < wordStartFrame + transitionFrames) {
      // Fade in
      progress = interpolate(frame, [wordStartFrame, wordStartFrame + transitionFrames], [0, 1], {
        easing: CONFIG.transitionEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (frame < nextWordStartFrame) {
      // Fully active
      progress = 1;
    } else if (frame < nextWordStartFrame + transitionFrames) {
      // Fade out
      progress = interpolate(frame, [nextWordStartFrame, nextWordStartFrame + transitionFrames], [1, 0], {
        easing: CONFIG.transitionEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else {
      progress = 0;
    }

    return { word: w, progress };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CONFIG.backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${CONFIG.paddingHorizontal}px`,
        width,
        height,
      }}
    >
      <Audio src={staticFile("narration.mp3")} />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: `${CONFIG.wordGap}px`,
          lineHeight: CONFIG.lineHeight,
          textAlign: "center",
          maxWidth: CONFIG.maxWidth,
        }}
      >
        {wordHighlights.map(({ word: w, progress }) => {
          const isActive = progress > 0;
          const scale = interpolate(progress, [0, 1], [0.95, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const opacity = progress; // fade in/out

          // Styles for outline vs filled highlight
          const getHighlightStyles = () => {
            if (CONFIG.highlightStyle === "filled") {
              return {
                backgroundColor: progress > 0 ? CONFIG.highlightColor : "transparent",
                padding: `0 ${CONFIG.highlightPadding}px`,
                borderRadius: CONFIG.highlightBorderRadius,
                color: progress > 0 ? CONFIG.backgroundColor : CONFIG.textColor,
                boxShadow: "none",
              };
            } else {
              // Outline style: white text with animated border box
              const outlineOpacity = progress;
              const outlineScale = interpolate(progress, [0, 1], [0.8, 1], {
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
              key={`${w.start}-${w.word}`}
              style={{
                fontSize: CONFIG.fontSize,
                fontWeight: CONFIG.fontWeight,
                fontFamily: CONFIG.fontFamily,
                whiteSpace: "nowrap",
                transform: `scale(${scale})`,
                transformOrigin: "center",
                opacity,
                transition: "none", // we handle animation via interpolate, not CSS
                ...highlightStyles,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Calculate duration from last word's end + buffer
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
