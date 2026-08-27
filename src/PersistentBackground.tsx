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
        overflow: "hidden",
      }}
    >
      {/* Top edge cuboid */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100px", backgroundColor: "#3b82f6", opacity: 0.3 }} />
      
      {/* Bottom edge cuboid */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "100px", backgroundColor: "#ef4444", opacity: 0.3 }} />
      
      {/* Left edge cuboid */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100px", height: "100%", backgroundColor: "#10b981", opacity: 0.3 }} />
      
      {/* Right edge cuboid */}
      <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100%", backgroundColor: "#a855f7", opacity: 0.3 }} />
    </AbsoluteFill>
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
