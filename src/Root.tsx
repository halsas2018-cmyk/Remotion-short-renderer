import React from "react";
import { KineticCaptionsComposition } from "./KineticCaptions";
import { ChartCounterTestComposition } from "./ChartCounter";
import { ChartComparisonTestComposition } from "./ChartComparison";
import { IconTextTestComposition } from "./IconText";
import { KeyStatementTestComposition } from "./KeyStatement";
import { TimelineTestComposition } from "./Timeline";
import { ProcessFlowTestComposition } from "./ProcessFlow";
import { VersusCardTestComposition } from "./VersusCard";
import { ChartLineTestComposition } from "./ChartLine";
import { MapLocationTestComposition } from "./MapLocation";
import { QuoteCardTestComposition } from "./QuoteCard";
import { ProgressMeterTestComposition } from "./ProgressMeter";
import { BeforeAfterTestComposition } from "./BeforeAfter";
import { BackgroundTestComposition } from "./PersistentBackground";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <BackgroundTestComposition />
      <KineticCaptionsComposition />
      <ChartCounterTestComposition />
      <ChartComparisonTestComposition />
      <IconTextTestComposition />
      <KeyStatementTestComposition />
      <TimelineTestComposition />
      <ProcessFlowTestComposition />
      <VersusCardTestComposition />
      <ChartLineTestComposition />
      <MapLocationTestComposition />
      <QuoteCardTestComposition />
      <ProgressMeterTestComposition />
      <BeforeAfterTestComposition />
    </>
  );
};
