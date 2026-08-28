import React from "react";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";

// Build a single 3D letter "S" out of small cubes arranged along the path
// of the letter glyph. This gives the S real width, depth and volume.
const S_CUBES: Array<{ x: number; y: number; z: number }> = (() => {
  // The path of a capital S, traced in a 7x9 unit grid.
  // Each row is rendered as a list of x positions where a cube lives.
  // We give every cube a slight z offset (front face) so the letter has depth.
  const rows: number[][] = [
    [1, 2, 3, 4, 5], // top bar
    [1], // top-left vertical
    [1], // middle-left vertical
    [1, 2, 3, 4, 5], // middle bar
    [5], // bottom-right vertical
    [5], // bottom-right vertical (continued)
    [1, 2, 3, 4, 5], // bottom bar
  ];

  const cubeSize = 0.4;
  const gap = 0.05;
  const step = cubeSize + gap;
  const cubes: Array<{ x: number; y: number; z: number }> = [];

  // Center the letter around (0,0). Rows are top-to-bottom in y.
  const totalHeight = rows.length * step;
  const yStart = totalHeight / 2 - cubeSize / 2;

  rows.forEach((row, rowIdx) => {
    // Slight z-stagger so the letter feels "carved" into the block
    const z = 0;
    row.forEach((col) => {
      // Center horizontally: each row's columns are 1..5 (5 cells wide)
      const x = (col - 3) * step; // -2..2 in steps of `step`
      const y = yStart - rowIdx * step;
      cubes.push({ x, y, z });
    });
  });

  return cubes;
})();

const SLetter: React.FC<{
  frame: number;
  letterSize: number;
}> = ({ frame, letterSize }) => {
  // Slow, dramatic rotation so the 3D depth is visible
  const rotationY = frame * 0.04;
  const rotationX = Math.sin(frame * 0.03) * 0.2;

  const cubeSize = 0.4;
  // Slight breathing scale
  const breath = 1 + Math.sin(frame * 0.05) * 0.04;

  return (
    <group rotation={[rotationX, rotationY, 0]} scale={breath * letterSize}>
      {S_CUBES.map((cube, i) => {
        // Subtle per-cube phase so the letter "shimmers" internally
        const offsetY = Math.sin(frame * 0.08 + i * 0.4) * 0.02;
        return (
          <mesh
            key={`s-cube-${i}`}
            position={[cube.x, cube.y + offsetY, cube.z]}
          >
            <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#cbd5e1"
              emissiveIntensity={0.35}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Accent cubes orbiting the S — gives the logo a "data/orbit" feel
const AccentOrbit: React.FC<{
  frame: number;
  letterSize: number;
}> = ({ frame, letterSize }) => {
  const rotationY = frame * 0.04;
  const rotationX = Math.sin(frame * 0.03) * 0.2;
  const count = 6;
  const radius = 1.6 * letterSize;
  const cubes: React.ReactElement[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + frame * 0.02;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = Math.sin(frame * 0.05 + i) * 0.3;
    cubes.push(
      <mesh
        key={`accent-${i}`}
        position={[x, y, z]}
        rotation={[rotationX, rotationY, 0]}
      >
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#94a3b8"
          emissiveIntensity={0.4}
        />
      </mesh>,
    );
  }

  return <group rotation={[rotationX, rotationY, 0]}>{cubes}</group>;
};

export const Logo: React.FC<{
  size?: number;
}> = ({ size = 1 }) => {
  const frame = useCurrentFrame();

  // Gentle floating up/down
  const floatY = Math.sin(frame * 0.05) * 0.1;

  // Logo canvas size — keep big and readable on 1080x1920
  const px = 460 * size;
  const letterSize = 1.4 * size;

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
          <ambientLight intensity={0.55} />
          <directionalLight position={[5, 5, 5]} intensity={0.9} />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} />
          <SLetter frame={frame} letterSize={letterSize} />
          <AccentOrbit frame={frame} letterSize={letterSize} />
        </ThreeCanvas>

        {/* "NEWS" wordmark below the 3D S, in 2D SVG so it stays crisp */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 12,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg
            viewBox="0 0 100 30"
            width="55%"
            height="auto"
            style={{
              filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))",
            }}
          >
            <text
              x="50"
              y="22"
              textAnchor="middle"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="20"
              fontWeight="800"
              fill="#0f172a"
              letterSpacing="6"
            >
              NEWS
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
