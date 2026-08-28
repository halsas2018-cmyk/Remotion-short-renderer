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
  size: number;
  frame: number;
}> = ({ position, color, size, frame }) => {
  const rotationSpeed = 0.05;
  const rotationX = frame * rotationSpeed;
  const rotationY = frame * rotationSpeed * 1.3;

  return (
    <mesh position={position} rotation={[rotationX, rotationY, 0]}>
      <boxGeometry args={[size, size, size]} />
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

  // Main grid cuboids
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = xStart + col * xSpacing;
      const y = yStart + row * ySpacing;
      cuboids.push(
        <SmallCuboid
          key={`main-${row}-${col}`}
          position={[x, y, 0]}
          color="#3b82f6"
          size={0.25}
          frame={frame}
        />,
      );
    }
  }

  // Smaller cuboids at each intersection (between every 4 main cuboids)
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const x = xStart + (col + 0.5) * xSpacing;
      const y = yStart + (row + 0.5) * ySpacing;
      cuboids.push(
        <SmallCuboid
          key={`intersect-${row}-${col}`}
          position={[x, y, 0]}
          color="#3b82f6"
          size={0.15}
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
