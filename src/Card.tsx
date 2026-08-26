import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* 3D Cube Card — built with React Three Fiber inside <ThreeCanvas>   */
/* ------------------------------------------------------------------ */

interface CubeCardProps {
  children?: React.ReactNode;
  /** Cube size in world units. Default: 4 */
  size?: number;
  /** Entrance duration in frames. Default: ~0.9s */
  entranceDuration?: number;
  /** Frame where idle animation begins. Default: right after entrance */
  idleStartFrame?: number;
  /** Video width for responsive sizing */
  videoWidth?: number;
}

/** Lighting rig — deterministic, no self-animation */
const Lighting: React.FC = () => {
  const { scene } = useThree();

  // Create lights imperatively to avoid JSX transform issues
  React.useEffect(() => {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 6);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -8;
    dirLight.shadow.camera.right = 8;
    dirLight.shadow.camera.top = 8;
    dirLight.shadow.camera.bottom = -8;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 50;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-4, 3, -5);
    scene.add(fillLight);

    return () => {
      scene.remove(ambient);
      scene.remove(dirLight);
      scene.remove(fillLight);
    };
  }, [scene]);

  return null;
};

/** Inner cube mesh — receives frame-driven transforms via useFrame */
const CubeMesh: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance params
  const enterDur = 27; // ~0.9s at 30fps
  const flightDistance = 20;

  // Entrance: fly in from -Z with rotational settle
  const progress = Math.min(frame / enterDur, 1);
  const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out

  const z = -flightDistance + flightDistance * eased;
  const rotX = (1 - eased) * 0.5; // ~28 deg
  const rotY = (1 - eased) * -0.3; // ~-17 deg

  // Idle float + drift
  const idleStart = enterDur;
  const idleT = Math.max(0, frame - idleStart);
  const t = idleT / fps;
  const floatY = Math.sin(t * Math.PI * 2 * 0.45) * 0.15;
  const driftX = Math.sin(t * Math.PI * 2 * 0.31 + 1.2) * 0.03;
  const driftY = Math.cos(t * Math.PI * 2 * 0.26) * 0.04;

  // Ref to mesh for direct manipulation in useFrame
  const meshRef = React.useRef<THREE.Mesh>(null);

  // Drive transforms via useFrame (runs every frame, deterministic)
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(0, floatY, z);
    meshRef.current.rotation.set(rotX + driftX, rotY + driftY, 0);
  });

  // Cube geometry + materials (6 faces with subtle variation)
  const half = size / 2;
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.8, metalness: 0.05 }), // +X right
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8, metalness: 0.05 }), // -X left
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.05 }), // +Y top
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8, metalness: 0.05 }), // -Y bottom
    new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.75, metalness: 0.05 }), // +Z front
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.8, metalness: 0.05 }), // -Z back
  ];

  // Accent top edge (thin line along top front edge)
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setFromPoints([
    new THREE.Vector3(-half, half, half),
    new THREE.Vector3(half, half, half),
  ]);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xe86c00, linewidth: 2 });

  return (
    <group ref={meshRef}>
      <mesh geometry={new THREE.BoxGeometry(size, size, size)} material={materials} castShadow receiveShadow />
      <line geometry={edgeGeo} material={edgeMat} />
      {/* Subtle wireframe overlay for depth perception */}
      <mesh
        geometry={new THREE.BoxGeometry(size * 1.002, size * 1.002, size * 1.002)}
        material={new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, opacity: 0.03, transparent: true })}
      />
    </group>
  );
};

/** Floor shadow catcher */
const Floor: React.FC<{ size: number }> = ({ size }) => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -size / 2 - 0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[size * 3, size * 3]} />
      <meshStandardMaterial color={0xffffff} transparent opacity={0} />
    </mesh>
  );
};

export const Card: React.FC<CubeCardProps> = ({
  children, // kept for API compatibility; not rendered in 3D (use texture if needed)
  size = 4,
  entranceDuration,
  idleStartFrame,
  videoWidth = 1080,
}) => {
  const { fps, width, height } = useVideoConfig();

  // ThreeCanvas requires explicit width/height in pixels
  // Map world units to fill ~70% of shorter dimension
  const canvasSize = Math.min(width, height) * 0.7;

  return (
    <ThreeCanvas
      width={canvasSize}
      height={canvasSize}
      camera={{ position: [0, 0, 12], fov: 35 }}
      shadows
      style={{ transform: "translateZ(0)" }} // force GPU layer
    >
      <Lighting />
      <Floor size={size} />
      <CubeMesh size={size} />
    </ThreeCanvas>
  );
};
