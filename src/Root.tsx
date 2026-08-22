import React from "react";
import { KineticCaptionsComposition } from "./KineticCaptions";
import { ChartCounterTestComposition } from "./ChartCounter";
import { ChartComparisonTestComposition } from "./ChartComparison";
import { IconTextTestComposition } from "./IconText";
import { KeyStatementTestComposition } from "./KeyStatement";
import { TimelineTestComposition } from "./Timeline";
import { ProcessFlowTestComposition } from "./ProcessFlow";
import { VersusCardTestComposition } from "./VersusCard";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <KineticCaptionsComposition />
      <ChartCounterTestComposition />
      <ChartComparisonTestComposition />
      <IconTextTestComposition />
      <KeyStatementTestComposition />
      <TimelineTestComposition />
      <ProcessFlowTestComposition />
      <VersusCardTestComposition />
    </>
  );
};
