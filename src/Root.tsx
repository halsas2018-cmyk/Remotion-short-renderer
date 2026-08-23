// Root.tsx - Composition exports for Remotion Studio auto-discovery
// These named exports allow Remotion Studio to discover compositions without registerRoot
// The actual registerRoot is in index.ts with the RemotionRoot component

import { Composition } from "remotion";
import { PersistentBackground } from "./PersistentBackground";
import { KineticCaptions } from "./KineticCaptions";
import { ChartCounter } from "./ChartCounter";
import { ChartComparison } from "./ChartComparison";
import { IconText } from "./IconText";
import { KeyStatement } from "./KeyStatement";
import { Timeline } from "./Timeline";
import { ProcessFlow } from "./ProcessFlow";
import { VersusCard } from "./VersusCard";
import { ChartLine } from "./ChartLine";
import { MapLocation } from "./MapLocation";
import { QuoteCard } from "./QuoteCard";
import { ProgressMeter } from "./ProgressMeter";
import { BeforeAfter } from "./BeforeAfter";
import { MotionGraphicsVideo } from "./MotionGraphicsVideo";
import timedBeats from "./sample-timed-beats.json";

interface TimedBeatsData {
  fps: number;
  totalDurationInFrames: number;
  beats: unknown[];
}

const beatsData = timedBeats as TimedBeatsData;
const { fps, totalDurationInFrames } = beatsData;

// Register all compositions as named exports for Remotion Studio
export const BackgroundTest = () => (
  <Composition
    id="BackgroundTest"
    component={PersistentBackground}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);

export const KineticCaptionsComposition = () => (
  <Composition
    id="KineticCaptions"
    component={KineticCaptions}
    durationInFrames={Math.round((1 + 30) * 30)}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);

export const ChartCounterTest = () => (
  <Composition
    id="ChartCounterTest"
    component={ChartCounter}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      value: 70000000000,
      label: "in debt",
      durationInFrames: 90,
    }}
  />
);

export const ChartComparisonTest = () => (
  <Composition
    id="ChartComparisonTest"
    component={ChartComparison}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      items: [
        { label: "Broadcom", value: 70000000000 },
        { label: "Nvidia", value: 500000000000 },
      ],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const IconTextTest = () => (
  <Composition
    id="IconTextTest"
    component={IconText}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      icon: "risk",
      text: "Broadcom only guarantees part of the loan",
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const KeyStatementTest = () => (
  <Composition
    id="KeyStatementTest"
    component={KeyStatement}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      emphasisWords: ["scarce"],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const TimelineTest = () => (
  <Composition
    id="TimelineTest"
    component={Timeline}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      events: [
        { marker: "2024", label: "Meta raised $27B" },
        { marker: "2029", label: "Exposure could hit $370B" },
      ],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const ProcessFlowTest = () => (
  <Composition
    id="ProcessFlowTest"
    component={ProcessFlow}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      steps: ["Buys the chips", "Leases them back", "Customer pays over time"],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const VersusCardTest = () => (
  <Composition
    id="VersusCardTest"
    component={VersusCard}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      left: { label: "Broadcom", value: "$70B debt" },
      right: { label: "Nvidia", value: "$500B exposure" },
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const ChartLineTest = () => (
  <Composition
    id="ChartLineTest"
    component={ChartLine}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      points: [
        { label: "Q1", value: 12000000000 },
        { label: "Q2", value: 18000000000 },
        { label: "Q3", value: 15000000000 },
        { label: "Q4", value: 27000000000 },
      ],
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const MapLocationTest = () => (
  <Composition
    id="MapLocationTest"
    component={MapLocation}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      locationName: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const QuoteCardTest = () => (
  <Composition
    id="QuoteCardTest"
    component={QuoteCard}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      quote: "The best way to predict the future is to invent it",
      attribution: "Alan Kay",
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const ProgressMeterTest = () => (
  <Composition
    id="ProgressMeterTest"
    component={ProgressMeter}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      value: 70000000000,
      maxValue: 100000000000,
      label: "Funding Secured",
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const BeforeAfterTest = () => (
  <Composition
    id="BeforeAfterTest"
    component={BeforeAfter}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      beforeLabel: "Manual Chip Procurement",
      afterLabel: "Automated Lease-Back Model",
      durationInFrames: 90,
      exitDirection: "up",
    }}
  />
);

export const MotionGraphicsVideoComposition = () => (
  <Composition
    id="MotionGraphicsVideo"
    component={MotionGraphicsVideo}
    durationInFrames={totalDurationInFrames}
    fps={fps}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
