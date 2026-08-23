import React from "react";
import { registerRoot, Composition } from "remotion";
import { ChartCounter } from "./ChartCounter";
import { ChartComparison } from "./ChartComparison";
import { ChartLine } from "./ChartLine";
import { IconText } from "./IconText";
import { KeyStatement } from "./KeyStatement";
import { KineticCaptions } from "./KineticCaptions";
import { MapLocation } from "./MapLocation";
import { PlainText } from "./PlainText";
import { ProcessFlow } from "./ProcessFlow";
import { ProgressMeter } from "./ProgressMeter";
import { QuoteCard } from "./QuoteCard";
import { Timeline } from "./Timeline";
import { VersusCard } from "./VersusCard";
import { BeforeAfter } from "./BeforeAfter";
import { PersistentBackground } from "./PersistentBackground";
import { MotionGraphicsVideo } from "./MotionGraphicsVideo";
import timedBeats from "./sample-timed-beats.json";

interface TimedBeatsData {
  fps: number;
  totalDurationInFrames: number;
  beats: unknown[];
}

const beatsData = timedBeats as TimedBeatsData;
const { fps, totalDurationInFrames } = beatsData;

// Root component that renders all compositions for Remotion Studio
const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BackgroundTest"
        component={PersistentBackground}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
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
          exitDirection: "up",
        }}
      />
      <Composition
        id="ChartLineTest"
        component={ChartLine}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          points: [
            { label: "Q1", value: 100 },
            { label: "Q2", value: 180 },
            { label: "Q3", value: 250 },
            { label: "Q4", value: 400 },
          ],
          durationInFrames: 90,
          exitDirection: "up",
        }}
      />
      <Composition
        id="IconTextTest"
        component={IconText}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          icon: "risk",
          text: "Broadcom only guarantees part of the loan",
          durationInFrames: 120,
          exitDirection: "up",
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
          durationInFrames: 120,
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
        defaultProps={{}}
      />
      <Composition
        id="MapLocationTest"
        component={MapLocation}
        durationInFrames={120}
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
      <Composition
        id="PlainTextTest"
        component={PlainText}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          text: "This is a plain text component for simple messages.",
          durationInFrames: 90,
          exitDirection: "up",
        }}
      />
      <Composition
        id="ProcessFlowTest"
        component={ProcessFlow}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          steps: [
            "Buy AI chips",
            "Lease back to customers",
            "Customers pay monthly",
            "Recoup investment + profit",
          ],
          durationInFrames: 120,
          exitDirection: "up",
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
          value: 65,
          maxValue: 100,
          label: "Funding Secured",
          durationInFrames: 90,
          exitDirection: "up",
        }}
      />
      <Composition
        id="QuoteCardTest"
        component={QuoteCard}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          quote: "People who are really serious about software should make their own hardware.",
          attribution: "Alan Kay",
          durationInFrames: 90,
          exitDirection: "up",
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
          durationInFrames: 120,
          exitDirection: "up",
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
          durationInFrames: 90,
          exitDirection: "up",
        }}
      />
      <Composition
        id="BeforeAfterTest"
        component={BeforeAfter}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          beforeLabel: "Manual lease-back",
          afterLabel: "Automated platform",
          durationInFrames: 90,
          exitDirection: "up",
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
    </>
  );
};

registerRoot(RemotionRoot);
