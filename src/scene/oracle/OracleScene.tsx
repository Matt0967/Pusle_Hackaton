import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { DerivedEnergyState, EnergySnapshot } from "../../domain/energy";
import { clamp } from "../../utils/math";

interface OracleSceneProps {
  snapshot?: EnergySnapshot;
  derived?: DerivedEnergyState;
}

export function OracleScene({ snapshot, derived }: OracleSceneProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Group>(null);
  const count = 1100;
  const wind = snapshot?.engie.windFleetLoadFactor ?? 0.35;
  const solar = snapshot?.engie.solarFleetLoadFactor ?? 0.3;
  const carbon = derived?.carbonPressure ?? 0.3;
  const renewable = derived?.renewableShare ?? 0.38;
  const stress = derived?.gridStress ?? "watch";
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const radius = 1.2 + Math.random() * 6.8;
      const angle = Math.random() * Math.PI * 2;
      data[index * 3] = Math.cos(angle) * radius;
      data[index * 3 + 1] = (Math.random() - 0.5) * 4.8;
      data[index * 3 + 2] = Math.sin(angle) * radius;
    }

    return data;
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;

    if (pointsRef.current) {
      const attribute = pointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;

      for (let index = 0; index < count; index += 1) {
        const xIndex = index * 3;
        const yIndex = index * 3 + 1;
        const zIndex = index * 3 + 2;
        const x = attribute.array[xIndex] as number;
        const z = attribute.array[zIndex] as number;
        const angle = Math.atan2(z, x) + 0.002 + wind * 0.014;
        const radius = Math.sqrt(x * x + z * z) + Math.sin(elapsed * 0.6 + index) * 0.003;

        attribute.array[xIndex] = Math.cos(angle) * radius;
        attribute.array[zIndex] = Math.sin(angle) * radius;
        attribute.array[yIndex] = Math.sin(elapsed * (0.45 + solar) + index * 0.04) * (1.4 + renewable * 3.2);
      }

      attribute.needsUpdate = true;
    }

    if (ringRef.current) {
      ringRef.current.rotation.y = elapsed * (0.1 + wind * 0.26);
      ringRef.current.rotation.x = Math.sin(elapsed * 0.2) * 0.22;
    }
  });

  const color = new THREE.Color("#5de0d7").lerp(new THREE.Color("#ffc857"), solar).lerp(new THREE.Color("#ff6b6b"), carbon * 0.45);
  const stressScale = stress === "critical" ? 1.35 : stress === "strained" ? 1.15 : 1;

  return (
    <group>
      <ambientLight intensity={0.38 + solar * 0.6} />
      <pointLight position={[0, 4, 0]} intensity={12 + solar * 14} color={color} distance={20} />
      <group ref={ringRef} scale={stressScale}>
        {[0, 1, 2].map((index) => (
          <mesh key={index} rotation={[index * 0.8, index * 1.2, 0]}>
            <torusGeometry args={[2.3 + index * 0.9, 0.015 + index * 0.006, 8, 96]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7 - index * 0.12} transparent opacity={0.48} />
          </mesh>
        ))}
      </group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.035 + clamp(wind + solar, 0, 1.4) * 0.035}
          transparent
          opacity={0.62 + renewable * 0.22}
          depthWrite={false}
        />
      </points>
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[0.72 + renewable * 0.55, 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} wireframe transparent opacity={0.76} />
      </mesh>
    </group>
  );
}
