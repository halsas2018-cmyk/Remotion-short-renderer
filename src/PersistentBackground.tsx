import React from "react";
import {
  AbsoluteFill,
  Composition,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Mesh, MeshStandardMaterial, BoxGeometry } from "three";
import { lightLeak } from "@remotion/effects/light-leak";

const EdgeCuboid: React.FC<{
  position: [number, number, number];
  color: string;
  frame: number;
  durationInFrames: number;
}> = ({ position, color, frame, durationInFrames }) => {
  const rotationSpeed = 0.02;
  const rotationX = frame * rotationSpeed;
  const rotationY = frame * rotationSpeed * 1.3;
  const rotationZ = frame * rotationSpeed * 0.7;

  const lightLeakProgress = interpolate(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <mesh position={position} rotation={[rotationX, rotationY, rotationZ]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={0.5}
        effects={[
          lightLeak({
            progress: lightLeakProgress,
            seed: Math.random(),
            hueShift: 0,
          }),
        ]}
      />
    </mesh>
  );
};

export const PersistentBackground: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const durationInFrames = 180;

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
        
        {/* Top edge cuboid */}
        <EdgeCuboid 
          position={[-width / 2 + 100, -height / 2 + 50, 0]} 
          color="#3b82f6" 
          frame={frame}
          durationInFrames={durationInFrames}
        />
        
        {/* Bottom edge cuboid */}
        <EdgeCuboid 
          position={[-width / 2 + 100, height / 2 - 50, 0]} 
          color="#ef4444" 
          frame={frame}
          durationInFrames={durationInFrames}
        />
        
        {/* Left edge cuboid */}
        <EdgeCuboid 
          position={[-width / 2 + 50, -height / 2 + 100, 0]} 
          color="#10b981" 
          frame={frame}
          durationInFrames={durationInFrames}
        />
        
        {/* Right edge cuboid */}
        <EdgeCuboid 
          position={[width / 2 - 50, -height / 2 + 100, 0]} 
          color="#a855f7" 
          frame={frame}
          durationInFrames={durationInFrames}
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
