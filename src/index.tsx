import React from "react";
import { Composition, registerRoot } from "remotion";
import { PersistentBackground } from "./PersistentBackground";
import { KineticCaptions, createKineticCaptionsComposition } from "./KineticCaptions";
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

// Import timestamps directly - webpack bundles it
import timestampsData from "./timestamps.json";

interface TimedBeatsData {
  fps: number;
  totalDurationInFrames: number;
  beats: unknown[];
}

const beatsData = timedBeats as TimedBeatsData;
const { fps, totalDurationInFrames } = beatsData;

// Example dynamic captions for testing
const sampleCaptions1 = [
  { word: "Broadcom", start: 0.5, end: 1.2 },
  { word: "buys", start: 1.3, end: 1.6 },
  { word: "AI", start: 1.7, end: 2.0 },
  { word: "chips", start: 2.1, end: 2.5 },
  { word: "and", start: 2.6, end: 2.7 },
  { word: "leases", start: 2.8, end: 3.1 },
  { word: "them", start: 3.2, end: 3.4 },
  { word: "back", start: 3.5, end: 3.8 },
];

const sampleCaptions2 = [
  { word: "The", start: 0.0, end: 0.3 },
  { word: "gamble", start: 0.4, end: 0.9 },
  { word: "works", start: 1.0, end: 1.3 },
  { word: "while", start: 1.4, end: 1.6 },
  { word: "chips", start: 1.7, end: 2.0 },
  { word: "are", start: 2.1, end: 2.2 },
  { word: "scarce", start: 2.3, end: 2.8 },
];

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
      words: timestampsData,
    }}
  />
);

// Dynamic composition examples - easy to create new ones with different captions
export const KineticCaptionsTest1 = createKineticCaptionsComposition(
  "KineticCaptionsTest1",
  sampleCaptions1,
  180
);

export const KineticCaptionsTest2 = createKineticCaptionsComposition(
  "KineticCaptionsTest2",
  sampleCaptions2,
  180
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
    }}
  />
);

export const KeyStatementTest = () => (
  <Composition
    id="KeyStatementTest"
    component={KeyStatement}
    durationInFrames={120}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The gamble works while AI chips are scarce",
      emphasisWords: ["scarce"],
      durationInFrames: 90,
    }}
  />
);

export const KeyStatementLongTest = () => (
  <Composition
    id="KeyStatementLongTest"
    component={KeyStatement}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "People who are really serious about software should make their own hardware",
      emphasisWords: ["serious", "software", "hardware"],
    }}
  />
);

export const KeyStatementShortTest = () => (
  <Composition
    id="KeyStatementShortTest"
    component={KeyStatement}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      text: "The future is already here",
      emphasisWords: ["future"],
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

// Call registerRoot() so Remotion finds compositions regardless of entry point
registerRoot({
  BackgroundTest,
  KineticCaptionsComposition,
  KineticCaptionsTest1,
  KineticCaptionsTest2,
  ChartCounterTest,
  ChartComparisonTest,
  IconTextTest,
  KeyStatementTest,
  KeyStatementLongTest,
  KeyStatementShortTest,
  TimelineTest,
  ProcessFlowTest,
  VersusCardTest,
  ChartLineTest,
  MapLocationTest,
  QuoteCardTest,
  ProgressMeterTest,
  BeforeAfterTest,
  MotionGraphicsVideoComposition,
});
