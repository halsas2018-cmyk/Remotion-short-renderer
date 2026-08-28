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
      <boxGeometry args={[0.4, 0.4, 0.4]} />
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

        {/* Small cuboids in all four corners (camera-space units: +Y is up) */}
        <SmallCuboid
          position={[1.75, 3.4, 0]}
          color="#3b82f6"
          frame={frame}
        />
        <SmallCuboid
          position={[-1.75, 3.4, 0]}
          color="#3b82f6"
          frame={frame}
        />
        <SmallCuboid
          position={[1.75, -3.4, 0]}
          color="#3b82f6"
          frame={frame}
        />
        <SmallCuboid
          position={[-1.75, -3.4, 0]}
          color="#3b82f6"
          frame={frame}
        />
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
