import React from "react";
import {
  AbsoluteFill,
  Composition,
  useVideoConfig,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Mesh, MeshStandardMaterial, BoxGeometry } from "three";

const EdgeCuboid: React.FC<{
  position: [number, number, number];
  color: string;
  frame: number;
  scale?: [number, number, number];
}> = ({ position, color, frame, scale = [1, 1, 1] }) => {
  const rotationSpeed = 0.02;
  const rotationX = frame * rotationSpeed;
  const rotationY = frame * rotationSpeed * 1.3;
  const rotationZ = frame * rotationSpeed * 0.7;

  return (
    <mesh position={position} rotation={[rotationX, rotationY, rotationZ]} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
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

  // Scale factors for cuboids to fill screen edges
  const edgeThickness = 100;
  const edgeDepth = 100;

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
        
        {/* Top edge cuboid - spans horizontally across top */}
        <EdgeCuboid 
          position={[0, -height / 2 + 50, 0]} 
          color="#3b82f6" 
          frame={frame}
          scale={[width / 2, edgeThickness, edgeDepth]}
        />
        
        {/* Bottom edge cuboid - spans horizontally across bottom */}
        <EdgeCuboid 
          position={[0, height / 2 - 50, 0]} 
          color="#ef4444" 
          frame={frame}
          scale={[width / 2, edgeThickness, edgeDepth]}
        />
        
        {/* Left edge cuboid - spans vertically along left side */}
        <EdgeCuboid 
          position={[-width / 2 + 50, 0, 0]} 
          color="#10b981" 
          frame={frame}
          scale={[edgeThickness, height / 2, edgeDepth]}
        />
        
        {/* Right edge cuboid - spans vertically along right side */}
        <EdgeCuboid 
          position={[width / 2 - 50, 0, 0]} 
          color="#a855f7" 
          frame={frame}
          scale={[edgeThickness, height / 2, edgeDepth]}
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
