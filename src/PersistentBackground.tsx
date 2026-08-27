import React from "react";
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, TorusGeometry } from "three";

interface RotatingCurveProps {
  color?: string;
  speed?: number;
  count?: number;
}

const RotatingCurve: React.FC<RotatingCurveProps> = ({
  color = "#64748b",
  speed = 0.02,
  count = 3,
}) => {
  const frame = useCurrentFrame();
  
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const radius = 0.8 + i * 0.3;
        const rotationY = frame * speed * (i + 1);
        const rotationX = frame * speed * 0.7 * (i + 1);
        
        return (
          <mesh
            key={i}
            rotation={[rotationX, rotationY, 0]}
          >
            <torusGeometry args={[radius, 0.03, 16, 100]} />
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
        <RotatingCurve color="#64748b" speed={0.015} count={4} />
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
