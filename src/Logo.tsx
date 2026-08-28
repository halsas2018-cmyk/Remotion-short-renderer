import React from "react";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";

export const Logo: React.FC<{
  size?: number;
}> = ({ size = 1 }) => {
  const frame = useCurrentFrame();

  // Slightly larger and more dramatic rotation
  const rotationY = frame * 0.04;
  const rotationX = Math.sin(frame * 0.03) * 0.2;

  // Gentle floating up/down
  const floatY = Math.sin(frame * 0.05) * 0.1;

  const px = 400 * size;

  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: px,
          height: px,
          transform: `translateY(${floatY * 30}px)`,
        }}
      >
        <ThreeCanvas width={px} height={px}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.9} />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} />
          {/* Main 3D white block */}
          <mesh
            position={[0, 0, 0]}
            rotation={[rotationX, rotationY, 0]}
          >
            <boxGeometry args={[2.5, 2.5, 2.5]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#e2e8f0"
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Smaller accent blocks around main */}
          <mesh
            position={[-1.8, 1.8, 0.4]}
            rotation={[rotationX, rotationY, 0]}
          >
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#cbd5e1"
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh
            position={[1.8, -1.8, 0.4]}
            rotation={[rotationX, rotationY, 0]}
          >
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#cbd5e1"
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* S letter front face — rendered as a textured plane stuck to the block */}
          <mesh
            position={[0, 0, 1.26]}
            rotation={[rotationX, rotationY, 0]}
          >
            <planeGeometry args={[1.8, 1.8]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
        </ThreeCanvas>
        {/* "NEWS" text overlay below the block */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <svg
            viewBox="0 0 100 100"
            width="55%"
            height="55%"
            style={{
              filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))",
            }}
          >
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="55"
              fontWeight="900"
              fill="#ffffff"
              letterSpacing="-3"
            >
              S
            </text>
            <text
              x="50"
              y="78"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="10"
              fontWeight="700"
              fill="#ffffff"
              letterSpacing="3"
            >
              NEWS
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
