import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
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

export const MotionGraphicsVideo: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
      }}
    >
      {/* Persistent background spanning full duration */}
      <Sequence from={0} durationInFrames={totalDurationInFrames}>
        <PersistentBackground />
      </Sequence>

      {/* Sequence each beat */}
      {beats.map((beat, index) => {
        const Component = componentMap[beat.type] || KeyStatement;
        const { type, startFrame, durationInFrames, ...props } = beat;

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <Component
              {...props}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
