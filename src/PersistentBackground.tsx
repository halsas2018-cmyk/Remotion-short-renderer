import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Mesh, MeshStandardMaterial, BoxGeometry } from "three";

interface RotatingCuboidProps {
  color?: string;
  speed?: number;
  count?: number;
}

const RotatingCuboids: React.FC<RotatingCuboidProps> = ({
  color = "#64748b",
  speed = 0.02,
  count = 20,
}) => {
  const frame = useCurrentFrame();
  
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        // Random position across the screen
        const x = (i % 5) * 0.4 - 0.8;
        const y = Math.floor(i / 5) * 0.4 - 0.8;
        const z = 0;
        
        // Random rotation speed and direction
        const rotationSpeed = speed * (0.5 + (i % 10) / 10);
        const rotationX = frame * rotationSpeed;
        const rotationY = frame * rotationSpeed * 1.3;
        const rotationZ = frame * rotationSpeed * 0.7;
        
        // Random scale for variety
        const scale = 0.1 + (i % 5) * 0.05;
        
        return (
          <mesh
            key={i}
            position={[x, y, z]}
            rotation={[rotationX, rotationY, rotationZ]}
            scale={scale}
          >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial 
              color={color} 
              emissive={color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.6}
            />
          </mesh>
        );
      })}
    </>
  );
};

export const PersistentBackground: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        width,
        height,
        overflow: "hidden",
      }}
    >
      <ThreeCanvas width={width} height={height}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <RotatingCuboids color="#64748b" speed={0.015} count={25} />
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
