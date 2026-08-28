import React from "react";
import {
  AbsoluteFill,
  Composition,
  useVideoConfig,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";

const SmallCuboid: React.FC<{
  position: [number, number, number];
  color: string;
  frame: number;
}> = ({ position, color, frame }) => {
  const rotationSpeed = 0.05;
  const rotationX = frame * rotationSpeed;
  const rotationY = frame * rotationSpeed * 1.3;

  return (
    <mesh position={position} rotation={[rotationX, rotationY, 0]}>
      <boxGeometry args={[0.25, 0.25, 0.25]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

export const PersistentBackground: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  // Grid of cuboids filling the screen (camera-space units: +Y is up)
  const cols = 5;
  const rows = 9;
  const xSpacing = 0.85;
  const ySpacing = 0.85;
  const xStart = -((cols - 1) / 2) * xSpacing;
  const yStart = -((rows - 1) / 2) * ySpacing;

  const cuboids: React.ReactElement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = xStart + col * xSpacing;
      const y = yStart + row * ySpacing;
      cuboids.push(
        <SmallCuboid
          key={`${row}-${col}`}
          position={[x, y, 0]}
          color="#3b82f6"
          frame={frame}
        />,
      );
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        width,
        height,
        overflow: "hidden",
      }}
    >
      <ThreeCanvas width={width} height={height}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        {cuboids}
      </ThreeCanvas>
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
