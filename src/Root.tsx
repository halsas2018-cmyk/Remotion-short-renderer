import React from "react";
import { Composition } from "remotion";
import { ChartCounter } from "./ChartCounter";
import { KeyStatement } from "./KeyStatement";
import { VersusCard } from "./VersusCard";
import { BeforeAfter } from "./BeforeAfter";
import { PlainText } from "./PlainText";
import { IconText } from "./IconText";
import { ProgressMeter } from "./ProgressMeter";
import { Timeline } from "./Timeline";
import { ChartComparison3D } from "./ChartComparison3D";
import { Map3D } from "./Map3D";
import { ChartLine } from "./ChartLine";
import { KineticCaptions } from "./KineticCaptions";
import timestampsData from "./timestamps.json";
import timedBeats from "./sample-timed-beats.json";

interface TimedBeatsData {
  fps: number;
  totalDurationInFrames: number;
  beats: unknown[];
}

const beatsData = timedBeats as TimedBeatsData;
const { fps, totalDurationInFrames } = beatsData;

// Root component - returns all compositions in a fragment
// This file should NOT call registerRoot()
export const RemotionRoot = () => (
  <>
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
    <Composition
      id="VersusCardTest"
      component={VersusCard}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        left: {
          label: "Broadcom",
          value: "$70B debt",
          items: ["Chip design", "Software", "Infrastructure"],
        },
        right: {
          label: "Nvidia",
          value: "$500B market cap",
          items: ["GPU monopoly", "CUDA lock-in", "Data center"],
        },
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
      }}
    />
    <Composition
      id="PlainTextTest"
      component={PlainText}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The gamble works while AI chips are scarce",
        durationInFrames: 120,
      }}
    />
    <Composition
      id="PlainTextLongTest"
      component={PlainText}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "People who are really serious about software should make their own hardware",
        durationInFrames: 180,
      }}
    />
    <Composition
      id="PlainTextShortTest"
      component={PlainText}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The future is already here",
        durationInFrames: 90,
      }}
    />
    <Composition
      id="IconTextTest"
      component={IconText}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        icon: "risk",
        text: "Broadcom only guarantees part of the loan",
        emphasisWords: ["guarantees", "part"],
        durationInFrames: 150,
      }}
    />
    <Composition
      id="ProgressMeterTest"
      component={ProgressMeter}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        value: 70000000000,
        maxValue: 100000000000,
        label: "Funding Secured",
      }}
    />
    <Composition
      id="ProgressMeterLongLabelTest"
      component={ProgressMeter}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        value: 50000000000,
        maxValue: 100000000000,
        label: "Quarterly Revenue Target",
      }}
    />
    <Composition
      id="TimelineTest"
      component={Timeline}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2029", label: "Exposure could hit $370B" },
        ],
      }}
    />
    <Composition
      id="Timeline3EventsTest"
      component={Timeline}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
        ],
      }}
    />
    <Composition
      id="Timeline4EventsTest"
      component={Timeline}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
          { marker: "2032", label: "AI chip market matures" },
        ],
      }}
    />
    <Composition
      id="Timeline5EventsTest"
      component={Timeline}
      durationInFrames={210}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2025", label: "AI infrastructure boom begins" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
          { marker: "2032", label: "AI chip market matures" },
        ],
      }}
    />
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
      id="Map3DTest"
      component={Map3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        locationName: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
        buildings: 8,
      }}
    />
    <Composition
      id="Map3DTokyoTest"
      component={Map3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        locationName: "Tokyo",
        latitude: 35.6762,
        longitude: 139.6503,
        buildings: 12,
      }}
    />
    <Composition
      id="Map3DLondonTest"
      component={Map3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        locationName: "London",
        latitude: 51.5074,
        longitude: -0.1278,
        buildings: 6,
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
        exitDirection: "up",
      }}
    />
    <Composition
      id="KineticCaptionsTest"
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
    <Composition
      id="MotionGraphicsVideo"
      component={() => <div style={{ width: "100%", height: "100%", background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>MotionGraphicsVideo - TODO</div>}
      durationInFrames={totalDurationInFrames}
      fps={fps}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  </>
);
