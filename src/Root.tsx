import React from "react";
import { Composition } from "remotion";
import { PersistentBackground } from "./PersistentBackground";
import { KineticCaptions } from "./KineticCaptions";
import { ChartCounter } from "./ChartCounter";
import { ChartComparison } from "./ChartComparison";
import { ChartComparison3D } from "./ChartComparison3D";
import { IconText } from "./IconText";
import { KeyStatement } from "./KeyStatement";
import { KeyStatement3D } from "./KeyStatement3D";
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
import timestampsData from "./timestamps.json";
import { ThreeDTestComposition } from "./ThreeDTest";

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

// Dynamic composition factory for KineticCaptions
function createKineticCaptionsComposition(
  id: string,
  words: Array<{ word: string; start: number; end: number }>,
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

// Root component - returns all compositions in a fragment
// This file should NOT call registerRoot()
export const RemotionRoot = () => (
  <>
    <Composition
      id="BackgroundTest"
      component={PersistentBackground}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
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
    {createKineticCaptionsComposition("KineticCaptionsTest1", sampleCaptions1, 180)}
    {createKineticCaptionsComposition("KineticCaptionsTest2", sampleCaptions2, 180)}
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
    {/* 3D chart experiment — extruded bars, floor grid, orbiting camera */}
    <Composition
      id="ChartComparison3DTest"
      component={ChartComparison3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        items: [
          { label: "Broadcom", value: 70000000000 },
          { label: "Nvidia", value: 500000000000 },
        ],
      }}
    />
    <Composition
      id="ChartComparison3DThreeTest"
      component={ChartComparison3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        items: [
          { label: "Meta", value: 27000000000 },
          { label: "Google", value: 85000000000 },
          { label: "Microsoft", value: 310000000000 },
        ],
      }}
    />
    <Composition
      id="ChartComparison3DFourTest"
      component={ChartComparison3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        items: [
          { label: "Q1", value: 12000000000 },
          { label: "Q2", value: 18000000000 },
          { label: "Q3", value: 15000000000 },
          { label: "Q4", value: 27000000000 },
        ],
      }}
    />
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
    {/* 3D variants — A/B against the originals above */}
    <Composition
      id="KeyStatement3DTest"
      component={KeyStatement3D}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The gamble works while AI chips are scarce",
        emphasisWords: ["scarce"],
      }}
    />
    <Composition
      id="KeyStatement3DLongTest"
      component={KeyStatement3D}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "People who are really serious about software should make their own hardware",
        emphasisWords: ["serious", "software", "hardware"],
      }}
    />
    <Composition
      id="KeyStatement3DShortTest"
      component={KeyStatement3D}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The future is already here",
        emphasisWords: ["future"],
      }}
    />
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
    <Composition
      id="MotionGraphicsVideo"
      component={MotionGraphicsVideo}
      durationInFrames={totalDurationInFrames}
      fps={fps}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
    <Composition
      id="ThreeDTest"
      component={ThreeDTestComposition}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
