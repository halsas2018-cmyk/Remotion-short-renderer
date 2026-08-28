import React from "react";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";

const ColorBlock: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  frame: number;
  letterOffset: [number, number, number];
}> = ({ position, size, frame, letterOffset }) => {
  const rotationX = frame * 0.04;
  const rotationY = frame * 0.05;

  return (
    <mesh
      position={position}
      rotation={[rotationX, rotationY, 0]}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#f97316"
        emissive="#ea580c"
        emissiveIntensity={0.6}
      />
    </mesh>
  );
};

const LetterOverlay: React.FC<{
  frame: number;
}> = ({ frame }) => {
  const rotationX = frame * 0.04;
  const rotationY = frame * 0.05;
  const floatY = Math.sin(frame * 0.06) * 0.05;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        transform: `translateY(${floatY * 20}px) rotateX(${rotationX}rad) rotateY(${rotationY}rad)`,
        transformStyle: "preserve-3d",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width="60%"
        height="60%"
        style={{
          filter: "drop-shadow(0 4px 12px rgba(255, 255, 255, 0.6))",
        }}
      >
        <defs>
          <linearGradient
            id="sGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
        </defs>
        <text
          x="50"
          y="55"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="60"
          fontWeight="900"
          fill="url(#sGradient)"
          letterSpacing="-3"
        >
          S
        </text>
        <text
          x="50"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="10"
          fontWeight="700"
          fill="#ffffff"
          letterSpacing="2"
        >
          NEWS
        </text>
      </svg>
    </div>
  );
};

export const Logo: React.FC<{
  size?: number;
}> = ({ size = 1 }) => {
  const frame = useCurrentFrame();
  const px = 140 * size;
  const floatY = Math.sin(frame * 0.06) * 0.05;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
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
          perspective: 1000,
          transform: `translateY(${floatY * 20}px)`,
        }}
      >
        <ThreeCanvas width={px} height={px}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={0.9} />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} />
          {/* Main 3D orange block */}
          <ColorBlock
            position={[0, 0, 0]}
            size={[1.8, 1.8, 1.8]}
            frame={frame}
            letterOffset={[0, 0, 0]}
          />
          {/* Smaller accent blocks around main */}
          <ColorBlock
            position={[-1.3, 1.3, 0.3]}
            size={[0.3, 0.3, 0.3]}
            frame={frame}
            letterOffset={[0, 0, 0]}
          />
          <ColorBlock
            position={[1.3, -1.3, 0.3]}
            size={[0.3, 0.3, 0.3]}
            frame={frame}
            letterOffset={[0, 0, 0]}
          />
        </ThreeCanvas>
        <LetterOverlay frame={frame} />
      </div>
    </div>
  );
};
