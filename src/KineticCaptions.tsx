import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Audio,
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

// Group words into beats (3-5 words, break at pauses > 0.3s)
function groupIntoBeats(words: Word[]): Beat[] {
  const beats: Beat[] = [];
  let currentBeat: Word[] = [];
  let beatStart = words[0]?.start ?? 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const nextWord = words[i + 1];
    const gap = nextWord ? nextWord.start - word.end : 0;

    currentBeat.push(word);

    // Break beat if: gap > 0.3s OR beat has 5 words OR it's the last word
    const shouldBreak =
      gap > 0.3 ||
      currentBeat.length >= 5 ||
      i === words.length - 1;

    if (shouldBreak && currentBeat.length > 0) {
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

  // Find current beat and active word
  let currentBeat: Beat | null = null;
  let activeWordIndex = -1;

  for (const beat of beats) {
    const beatStartFrame = Math.round(beat.start * fps);
    const beatEndFrame = Math.round(beat.end * fps);

    if (frame >= beatStartFrame && frame < beatEndFrame) {
      currentBeat = beat;
      // Find which word in this beat is currently spoken
      for (let i = 0; i < beat.words.length; i++) {
        const w = beat.words[i];
        const wStartFrame = Math.round(w.start * fps);
        const wEndFrame = Math.round(w.end * fps);
        if (frame >= wStartFrame && frame < wEndFrame) {
          activeWordIndex = i;
          break;
        }
      }
      break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 80px",
        width,
        height,
      }}
    >
      <Audio src={staticFile("narration.mp3")} />

      {currentBeat && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            lineHeight: 1.3,
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          {currentBeat.words.map((w, i) => (
            <span
              key={`${w.start}-${w.word}`}
              style={{
                fontSize: "72px",
                fontWeight: "800",
                fontFamily: "system-ui, sans-serif",
                color: "white",
                backgroundColor:
                  i === activeWordIndex ? "black" : "transparent",
                padding: i === activeWordIndex ? "0 16px" : 0,
                borderRadius: i === activeWordIndex ? "8px" : 0,
                boxShadow:
                  i === activeWordIndex
                    ? "0 0 0 4px black, 0 0 0 6px white"
                    : "none",
                whiteSpace: "nowrap",
              }}
            >
              {w.word}
            </span>
          ))}
        </div>
      )}
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
