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

// Import the timed beats data
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

export const MotionGraphicsVideo: React.FC = () => {
  const { width, height } = useVideoConfig();

  // Precompute adjusted start frames with 10-frame overlap
  const adjustedBeats = validatedBeats.map((beat, index) => {
    const rawStart = beat.startFrame;
    const overlapStart = Math.max(0, rawStart - 10);
    // Never start before previous beat's original startFrame
    const prevStart = index > 0 ? validatedBeats[index - 1].startFrame : 0;
    const finalStart = Math.max(overlapStart, prevStart);
    
    // Cycle through exit directions
    const exitDirection = EXIT_DIRECTIONS[index % EXIT_DIRECTIONS.length];

    return {
      ...beat,
      adjustedStartFrame: finalStart,
      exitDirection,
    };
  });

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        // Transparent background so PersistentBackground grid shows through
        backgroundColor: "transparent",
      }}
    >
      {/* Narration audio track - spans full duration, using staticFile like KineticCaptions */}
      <Audio src={staticFile("narration.mp3")} startFrom={0} endAt={totalDurationInFrames} />

      {/* Persistent background spanning full duration - bottom layer */}
      <Sequence from={0} durationInFrames={totalDurationInFrames}>
        <PersistentBackground />
      </Sequence>

      {/* Sequence each beat with overlap and exit direction */}
      {adjustedBeats.map((beat, index) => {
        const Component = componentMap[beat.type] || KeyStatement;
        const { type, startFrame, durationInFrames, adjustedStartFrame, exitDirection, ...props } = beat;

        return (
          <Sequence
            key={index}
            from={adjustedStartFrame}
            durationInFrames={durationInFrames}
          >
            <Component
              {...props}
              durationInFrames={durationInFrames}
              exitDirection={exitDirection}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
