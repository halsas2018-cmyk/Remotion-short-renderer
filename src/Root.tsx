import React from "react";
import { KineticCaptionsComposition } from "./KineticCaptions";
import { ChartCounterTestComposition } from "./ChartCounter";
import { ChartComparisonTestComposition } from "./ChartComparison";
import { IconTextTestComposition } from "./IconText";
import { PlainTextTestComposition } from "./PlainText";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <KineticCaptionsComposition />
      <ChartCounterTestComposition />
      <ChartComparisonTestComposition />
      <IconTextTestComposition />
      <PlainTextTestComposition />
    </>
  );
};
