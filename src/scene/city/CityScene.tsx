import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { DerivedEnergyState, EnergySnapshot } from "../../domain/energy";
import { useCityStatus } from "../../store/pulseStore";
import { clamp, lerp } from "../../utils/math";

interface CitySceneProps {
  snapshot?: EnergySnapshot;
  derived?: DerivedEnergyState;
}

const buildingLayout = [
  [-3.4, -2.2, 1.6],
  [-1.8, -2.6, 2.4],
  [0.1, -2.1, 1.3],
  [1.8, -2.4, 2.9],
  [3.2, -1.8, 1.8],
  [-3.0, 0.2, 2.7],
  [-1.1, 0.0, 1.5],
  [0.8, 0.4, 3.2],
  [2.7, 0.0, 1.7],
  [-2.1, 2.2, 1.8],
  [0.0, 2.4, 2.6],
  [2.0, 2.1, 1.4],
] as const;

export function CityScene({ snapshot, derived }: CitySceneProps) {
  const city = useCityStatus();
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const stress = derived?.gridStress ?? "watch";
  const vitality = city.vitality / 100;
  const windLoad = snapshot?.engie.windFleetLoadFactor ?? 0.38;
  const solarLoad = snapshot?.engie.solarFleetLoadFactor ?? 0.35;
  const stormLevel = stress === "critical" ? 1 : stress === "strained" ? 0.55 : 0;
  const accent = new THREE.Color(stressColor(stress));

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.025;
    }

    if (lightRef.current) {
      lightRef.current.intensity = lerp(1.6, 2.7, solarLoad) - stormLevel * 0.8;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.55 + solarLoad * 0.35} />
      <directionalLight
        ref={lightRef}
        position={[8, 12, 5]}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={["#d9fff2", "#27251c", 0.8]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 7]} />
        <meshStandardMaterial color={groundColor(stress)} roughness={0.88} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.65, 4.75, 7]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.16} />
      </mesh>

      <PathNetwork stress={stress} />
      <Park vitality={vitality} />
      <BatteryHub charge={city.shieldCharge} stress={stress} />

      {buildingLayout.map(([x, z, height], index) => (
        <Building
          key={`${x}-${z}`}
          position={[x, height / 2, z]}
          height={height}
          vitality={vitality}
          index={index}
          stress={stress}
        />
      ))}

      <EnergyCore vitality={vitality} stress={stress} />
      <EnergyPylons stress={stress} />
      <WindTurbines speed={windLoad} />
      <SolarField load={solarLoad} />
      <Citizens vitality={vitality} stress={stress} />
      <Pollution stormLevel={stormLevel} />
      <ShieldRing charge={city.shieldCharge} stress={stress} />
    </group>
  );
}

interface BuildingProps {
  position: [number, number, number];
  height: number;
  vitality: number;
  index: number;
  stress: string;
}

function Building({ position, height, vitality, index, stress }: BuildingProps) {
  const width = index % 3 === 0 ? 0.85 : 0.68;
  const color = new THREE.Color(stress === "critical" ? "#65524a" : "#7e927c").lerp(
    new THREE.Color("#a9d28a"),
    vitality,
  );
  const emissive = stress === "critical" ? "#4e1717" : "#112922";
  const roofColor = new THREE.Color(stress === "critical" ? "#53352f" : "#49665c").lerp(
    new THREE.Color("#6bbfa0"),
    vitality * 0.72,
  );
  const windowColor = stress === "critical" ? "#ff8e78" : vitality > 0.62 ? "#ffe08a" : "#72d9c9";
  const floors = Math.max(2, Math.floor(height * 1.8));

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial color={color} roughness={0.72} emissive={emissive} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0, height / 2 + 0.13, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[width * 0.72, 0.32, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.6} emissive={roofColor} emissiveIntensity={0.05 + vitality * 0.08} />
      </mesh>
      {Array.from({ length: floors }, (_, floor) => (
        <group key={floor} position={[0, -height / 2 + 0.45 + floor * 0.42, 0]}>
          {[-0.2, 0.2].map((offset) => (
            <mesh key={`front-${offset}`} position={[offset * width, 0, width / 2 + 0.012]}>
              <boxGeometry args={[0.11, 0.09, 0.018]} />
              <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={0.32 + vitality * 0.24} />
            </mesh>
          ))}
          <mesh position={[width / 2 + 0.012, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.11, 0.09, 0.018]} />
            <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={0.22 + vitality * 0.18} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PathNetwork({ stress }: { stress: string }) {
  const roadColor = stress === "critical" ? "#251512" : "#20241d";
  const lineColor = stressColor(stress);

  return (
    <group position={[0, 0.075, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[8.2, 0.035, 0.34]} />
        <meshStandardMaterial color={roadColor} roughness={0.82} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[6.7, 0.035, 0.32]} />
        <meshStandardMaterial color={roadColor} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[7.6, 0.018, 0.035]} />
        <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.038, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[6.1, 0.018, 0.035]} />
        <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.22} />
      </mesh>
    </group>
  );
}

function Park({ vitality }: { vitality: number }) {
  const treePositions = [
    [-4.0, 1.8],
    [-3.6, 2.6],
    [-4.6, 2.5],
    [3.6, 2.6],
    [4.3, 1.8],
    [3.4, 3.3],
    [-4.3, -0.9],
    [4.4, -0.8],
  ] as const;
  const foliage = new THREE.Color("#53633d").lerp(new THREE.Color("#86d36f"), vitality);

  return (
    <group>
      <mesh position={[-4.1, 0.082, 2.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.9, 6]} />
        <meshStandardMaterial color="#26351d" roughness={0.92} />
      </mesh>
      <mesh position={[4.0, 0.082, 2.45]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.82, 6]} />
        <meshStandardMaterial color="#26351d" roughness={0.92} />
      </mesh>
      {treePositions.map(([x, z], index) => (
        <Tree key={`${x}-${z}`} position={[x, 0, z]} color={foliage} scale={index % 3 === 0 ? 1.12 : 0.92} />
      ))}
    </group>
  );
}

function Tree({ position, color, scale }: { position: [number, number, number]; color: THREE.Color; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.44, 5]} />
        <meshStandardMaterial color="#6a5034" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <coneGeometry args={[0.24, 0.55, 6]} />
        <meshStandardMaterial color={color} roughness={0.74} />
      </mesh>
    </group>
  );
}

function BatteryHub({ charge, stress }: { charge: number; stress: string }) {
  const chargeLevel = clamp(charge / 100, 0, 1);
  const color = new THREE.Color("#244041").lerp(new THREE.Color(stressColor(stress)), 0.45 + chargeLevel * 0.35);

  return (
    <group position={[3.95, 0.18, -1.15]} rotation={[0, -0.45, 0]}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[index * 0.32, 0.3, 0]} castShadow>
          <boxGeometry args={[0.22, 0.58 + index * 0.08, 0.28]} />
          <meshStandardMaterial color="#3e4f4b" roughness={0.55} emissive={color} emissiveIntensity={0.08 + chargeLevel * 0.18} />
        </mesh>
      ))}
      <mesh position={[0.32, 0.78, 0]}>
        <boxGeometry args={[0.86, 0.04, 0.34]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35 + chargeLevel * 0.4} />
      </mesh>
    </group>
  );
}

function EnergyPylons({ stress }: { stress: string }) {
  const color = stressColor(stress);

  return (
    <group>
      {([
        [-4.8, -3.5],
        [4.8, -3.3],
      ] as const).map(([x, z], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]} rotation={[0, index === 0 ? 0.35 : -0.35, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.065, 1.2, 5]} />
            <meshStandardMaterial color="#bec8b6" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.17, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.05, 0.82, 0.05]} />
            <meshStandardMaterial color="#d7dfce" roughness={0.46} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.38} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function EnergyCore({ vitality, stress }: { vitality: number; stress: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const color = stressColor(stress);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * (1.6 + vitality)) * 0.06;
    groupRef.current.scale.setScalar(pulse);
    groupRef.current.rotation.y += 0.01 + vitality * 0.006;
  });

  return (
    <group ref={groupRef} position={[0, 1.05, 0]}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.44, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.48 + vitality * 0.36}
          roughness={0.36}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.025, 8, 7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.34 + vitality * 0.25} transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[0.2, Math.PI / 2, 0]}>
        <torusGeometry args={[0.72, 0.018, 8, 7]} />
        <meshStandardMaterial color="#5de0d7" emissive="#5de0d7" emissiveIntensity={0.22} transparent opacity={0.44} />
      </mesh>
    </group>
  );
}

function WindTurbines({ speed }: { speed: number }) {
  return (
    <group position={[-5.2, 0, 3.9]}>
      {[0, 1, 2].map((index) => (
        <WindTurbine key={index} position={[index * 1.15, 0, (index % 2) * 0.7]} speed={speed} />
      ))}
    </group>
  );
}

function WindTurbine({ position, speed }: { position: [number, number, number]; speed: number }) {
  const rotorRef = useRef<THREE.Group>(null);
  const bladeLength = 0.56;

  useFrame(() => {
    if (rotorRef.current) {
      rotorRef.current.rotation.z += 0.04 + speed * 0.36;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.055, 1.5, 6]} />
        <meshStandardMaterial color="#dbe7d1" roughness={0.6} />
      </mesh>
      <group ref={rotorRef} position={[0, 1.55, 0.04]}>
        {[0, 1, 2].map((blade) => (
          <group key={blade} rotation={[0, 0, (blade * Math.PI * 2) / 3]}>
            <mesh position={[0, bladeLength / 2, 0]}>
              <boxGeometry args={[0.035, bladeLength, 0.018]} />
              <meshStandardMaterial color="#f3f8e9" roughness={0.42} />
            </mesh>
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshStandardMaterial color="#ff8b82" emissive="#ff6b6b" emissiveIntensity={0.2} roughness={0.38} />
        </mesh>
      </group>
    </group>
  );
}

function SolarField({ load }: { load: number }) {
  const color = new THREE.Color("#213241").lerp(new THREE.Color("#66e6c5"), load);

  return (
    <group position={[4.5, 0.12, -3.7]} rotation={[0, -0.32, 0]}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh key={index} position={[(index % 3) * 0.62, 0.08, Math.floor(index / 3) * 0.62]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.5, 0.04, 0.38]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={load * 0.18} roughness={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function Citizens({ vitality, stress }: { vitality: number; stress: string }) {
  const citizens = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        radius: 1.15 + (index % 4) * 0.62,
        speed: 0.18 + (index % 5) * 0.035,
        phase: index * 0.7,
      })),
    [],
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const stressSlowdown = stress === "critical" ? 0.28 : stress === "strained" ? 0.58 : 1;

    groupRef.current.children.forEach((child, index) => {
      const citizen = citizens[index];
      const angle = citizen.phase + clock.elapsedTime * citizen.speed * stressSlowdown * (0.65 + vitality);
      child.position.x = Math.cos(angle) * citizen.radius;
      child.position.z = Math.sin(angle) * citizen.radius;
      child.position.y = 0.18 + Math.sin(clock.elapsedTime * 2 + index) * 0.025;
    });
  });

  return (
    <group ref={groupRef}>
      {citizens.map((citizen, index) => (
        <mesh key={index} position={[citizen.radius, 0.18, 0]} castShadow>
          <coneGeometry args={[0.08, 0.26, 5]} />
          <meshStandardMaterial color={stress === "critical" ? "#ffb3a7" : "#f2d39b"} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Pollution({ stormLevel }: { stormLevel: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 260;
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      values[index * 3] = (Math.random() - 0.5) * 12;
      values[index * 3 + 1] = 1 + Math.random() * 5.8;
      values[index * 3 + 2] = (Math.random() - 0.5) * 12;
    }

    return values;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current || stormLevel <= 0) {
      return;
    }

    const attribute = pointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;

    for (let index = 0; index < count; index += 1) {
      const yIndex = index * 3 + 1;
      const xIndex = index * 3;
      attribute.array[yIndex] = ((attribute.array[yIndex] as number) - 0.012 * stormLevel + 6) % 6;
      attribute.array[xIndex] = (attribute.array[xIndex] as number) + Math.sin(clock.elapsedTime + index) * 0.002;
    }

    attribute.needsUpdate = true;
  });

  if (stormLevel <= 0) {
    return null;
  }

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#b66a5e" size={0.075 + stormLevel * 0.055} transparent opacity={0.22 + stormLevel * 0.34} />
    </points>
  );
}

function ShieldRing({ charge, stress }: { charge: number; stress: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const intensity = clamp(charge / 100, 0, 1);
  const visible = intensity > 0.08 || stress === "critical";

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.rotation.z = clock.elapsedTime * 0.18;
    meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4) * 0.012);
  });

  if (!visible) {
    return null;
  }

  return (
    <mesh ref={meshRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[5.25, 0.035, 8, 7]} />
      <meshStandardMaterial color="#5de0d7" emissive="#5de0d7" emissiveIntensity={0.28 + intensity * 0.6} transparent opacity={0.38 + intensity * 0.36} />
    </mesh>
  );
}

function stressColor(stress: string) {
  if (stress === "critical") {
    return "#ff6b6b";
  }

  if (stress === "strained") {
    return "#ffc857";
  }

  if (stress === "green") {
    return "#8ad879";
  }

  return "#5de0d7";
}

function groundColor(stress: string) {
  if (stress === "critical") {
    return "#2a201b";
  }

  if (stress === "strained") {
    return "#25271c";
  }

  return "#1b2a20";
}
