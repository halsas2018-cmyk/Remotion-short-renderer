import React from "react";
import { KineticCaptionsComposition } from "./KineticCaptions";
import { ChartCounterTestComposition } from "./ChartCounter";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <KineticCaptionsComposition />
      <ChartCounterTestComposition />
    </>
  );
};
