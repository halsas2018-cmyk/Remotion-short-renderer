import React, { createContext, useContext, useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
  Audio,
  staticFile,
  interpolate,
  Easing,
} from "remotion";
import { PersistentBackground } from "./PersistentBackground";
import { ChartCounter } from "./ChartCounter";
import { ChartComparison } from "./ChartComparison";
import { ChartLine } from "./ChartLine";
import { IconText } from "./IconText";
import { KeyStatement } from "./KeyStatement";
import { Timeline } from "./Timeline";
import { ProcessFlow } from "./ProcessFlow";
import { VersusCard } from "./VersusCard";
import { MapLocation } from "./MapLocation";
import { QuoteCard } from "./QuoteCard";
import { ProgressMeter } from "./ProgressMeter";
import { SceneTransition } from "./SceneTransition";
import { KineticCaptions } from "./KineticCaptions";

import timedBeats from "./sample-timed-beats.json";

interface TimedBeat {
  type: string;
  startFrame: number;
  durationInFrames: number;
  [key: string]: unknown;
}

interface TimedBeatsData {
  fps: number;
  totalDurationInFrames: number;
  beats: TimedBeat[];
}

const beatsData = timedBeats as TimedBeatsData;
const { fps, totalDurationInFrames, beats } = beatsData;

// ============================================
// BEAT CONTEXT FOR CAPTION CONTROL
// ============================================
interface BeatContextValue {
  currentBeatType: string | null;
}

const BeatContext = createContext<BeatContextValue>({ currentBeatType: null });

export const useBeatContext = (): BeatContextValue => {
  return useContext(BeatContext);
};

// Component types that should SHOW captions (visual/data components)
const CAPTION_ENABLED_TYPES = new Set([
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
]);

// Component types that should HIDE captions (text/statement components)
const CAPTION_DISABLED_TYPES = new Set([
  "key_statement",
  "plain_text",
]);

// ============================================
// PHASE 1: DATA PREPROCESSING (Safety Net)
// ============================================
const MIN_BEAT_FRAMES = 45; // 1.5s minimum at 30fps

const validatedBeats: TimedBeat[] = beats.map((beat, index) => {
  if (beat.durationInFrames < MIN_BEAT_FRAMES) {
    console.warn(
      `[MotionGraphicsVideo] Beat ${index} (${beat.type}) duration too short: ${beat.durationInFrames}f → clamping to ${MIN_BEAT_FRAMES}f`
    );
    return { ...beat, durationInFrames: MIN_BEAT_FRAMES };
  }
  return beat;
});

// Type-to-component mapping
const componentMap: Record<string, React.ComponentType<Record<string, unknown>>> = {
  chart_counter: ChartCounter,
  chart_comparison: ChartComparison,
  chart_line: ChartLine,
  icon_text: IconText,
  key_statement: KeyStatement,
  timeline: Timeline,
  process_flow: ProcessFlow,
  versus: VersusCard,
  map_location: MapLocation,
  quote_card: QuoteCard,
  progress_meter: ProgressMeter,
};

// Exit directions cycle
const EXIT_DIRECTIONS = ["up", "down", "left", "right"] as const;
// Entry directions are opposite of exit for continuous flow
const ENTRY_DIRECTIONS = ["down", "up", "right", "left"] as const;

// ============================================
// CHUNK 3: SOUND MAP FOR PER-BEAT EFFECTS
// ============================================
const COUNTER_TYPES = new Set(["chart_counter", "chart_line", "progress_meter"]);

const SOUND_MAP: Record<string, { file: string; volume: number }> = {
  chart_counter: { file: "sfx-counter.mp3", volume: 0.25 },
  chart_line: { file: "sfx-counter.mp3", volume: 0.25 },
  progress_meter: { file: "sfx-counter.mp3", volume: 0.25 },
  // Default fallback for all other types
  default: { file: "sfx-whoosh.mp3", volume: 0.18 },
};

// Fade-out duration in frames for counter sounds
const COUNTER_FADE_FRAMES = 10;

export const MotionGraphicsVideo: React.FC = () => {
  const { width, height } = useVideoConfig();
  const globalFrame = useVideoConfig().durationInFrames > 0 ? 0 : 0; // placeholder, we'll use useCurrentFrame in provider

  // Precompute exit/entry directions with continuous linking
  // Beat N entryDirection = Beat N-1 exitDirection
  // First beat entryDirection defaults to "up"
  const beatsWithDirections = validatedBeats.map((beat, index) => {
    const exitDirection = EXIT_DIRECTIONS[index % EXIT_DIRECTIONS.length];
    const entryDirection = index === 0 
      ? "up" 
      : EXIT_DIRECTIONS[(index - 1) % EXIT_DIRECTIONS.length];

    return {
      ...beat,
      exitDirection,
      entryDirection,
    };
  });

  // BeatProvider component - determines current beat type from global frame
  const BeatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const frame = useCurrentFrame();
    
    const currentBeat = useMemo(() => {
      return beatsWithDirections.find(
        (beat) => frame >= beat.startFrame && frame < beat.startFrame + beat.durationInFrames
      ) || null;
    }, [frame]);

    const contextValue = useMemo<BeatContextValue>(
      () => ({ currentBeatType: currentBeat?.type || null }),
      [currentBeat?.type]
    );

    return (
      <BeatContext.Provider value={contextValue}>
        {children}
      </BeatContext.Provider>
    );
  };

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      <BeatProvider>
        {/* ============================================
            CHUNK 3: AUDIO LAYERS
            ============================================ */}
        
        {/* 1. NARRATION: full duration at frame 0 - explicit volume 1.0 */}
        <Audio 
          src={staticFile("narration.mp3")} 
          startFrom={0} 
          endAt={totalDurationInFrames}
          volume={1.0}
        />

        {/* 2. AMBIENT BED: continuous background at audible volume */}
        <Audio 
          src={staticFile("sfx-ambient.mp3")} 
          startFrom={0} 
          endAt={totalDurationInFrames}
          volume={0.35}
        />

        {/* 3. PER-BEAT SOUND EFFECTS: triggered at each beat's startFrame */}
        {beatsWithDirections.map((beat, index) => {
          // Skip whoosh sound for beats that were originally shorter than 45 frames
          // to avoid overlapping into the following transition
          const originalBeat = beats[index];
          const isShortBeat = originalBeat && originalBeat.durationInFrames < MIN_BEAT_FRAMES;
          
          const soundConfig = SOUND_MAP[beat.type] || SOUND_MAP.default;
          const isWhoosh = soundConfig.file === "sfx-whoosh.mp3";
          const isCounter = COUNTER_TYPES.has(beat.type);
          
          if (isShortBeat && isWhoosh) {
            return null;
          }
          
          // For counter types, trim playback to beat duration with fade-out
          if (isCounter) {
            const beatDuration = beat.durationInFrames;
            const fadeStartFrame = Math.max(0, beatDuration - COUNTER_FADE_FRAMES);
            
            return (
              <Sequence
                key={`sfx-${index}`}
                from={beat.startFrame}
                durationInFrames={beatDuration}
              >
                <Audio
                  src={staticFile(soundConfig.file)}
                  startFrom={0}
                  endAt={beatDuration}
                  volume={(frame) => {
                    // Fade out over the last COUNTER_FADE_FRAMES frames
                    if (frame >= fadeStartFrame) {
                      return interpolate(frame, [fadeStartFrame, beatDuration], [soundConfig.volume, 0], {
                        easing: Easing.linear,
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      });
                    }
                    return soundConfig.volume;
                  }}
                />
              </Sequence>
            );
          }
          
          // For whoosh and other sounds, play normally for the beat duration
          return (
            <Sequence
              key={`sfx-${index}`}
              from={beat.startFrame}
              durationInFrames={beat.durationInFrames}
            >
              <Audio
                src={staticFile(soundConfig.file)}
                startFrom={0}
                volume={soundConfig.volume}
              />
            </Sequence>
          );
        })}

        {/* Persistent background spanning full duration - bottom layer */}
        <Sequence from={0} durationInFrames={totalDurationInFrames}>
          <PersistentBackground />
        </Sequence>

        {/* Kinetic Captions - only renders during caption-enabled beats */}
        <KineticCaptions 
          captionEnabledTypes={CAPTION_ENABLED_TYPES}
          beats={beatsWithDirections}
        />

        {/* Sequence each beat with exact validated timing, wrapped in SceneTransition */}
        {beatsWithDirections.map((beat, index) => {
          const Component = componentMap[beat.type] || KeyStatement;
          const { type, startFrame, durationInFrames, exitDirection, entryDirection, ...props } = beat;

          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={durationInFrames}
            >
              <SceneTransition
                durationInFrames={durationInFrames}
                startFrame={startFrame}
                exitDirection={exitDirection}
                entryDirection={entryDirection}
              >
                <Component
                  {...props}
                  durationInFrames={durationInFrames}
                />
              </SceneTransition>
            </Sequence>
          );
        })}
      </BeatProvider>
    </AbsoluteFill>
  );
};
