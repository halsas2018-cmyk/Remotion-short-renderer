import React from "react";
import {
  AbsoluteFill,
  Composition,
  useVideoConfig,
} from "remotion";

export const PersistentBackground: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
      }}
    />
  );
};

export const BackgroundTestComposition: React.FC = () => (
  <Composition
    id="BackgroundTest"
    component={PersistentBackground}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
