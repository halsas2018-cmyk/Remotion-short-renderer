import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
  Audio,
  staticFile,
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

export const MotionGraphicsVideo: React.FC = () => {
  const { width, height } = useVideoConfig();

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

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      {/* Narration audio track - spans full duration */}
      <Audio src={staticFile("narration.mp3")} startFrom={0} endAt={totalDurationInFrames} />

      {/* Persistent background spanning full duration - bottom layer */}
      <Sequence from={0} durationInFrames={totalDurationInFrames}>
        <PersistentBackground />
      </Sequence>

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
    </AbsoluteFill>
  );
};
