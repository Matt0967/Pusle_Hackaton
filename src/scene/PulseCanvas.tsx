import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { DerivedEnergyState, EnergySnapshot } from "../domain/energy";
import { CityScene } from "./city/CityScene";
import { OracleScene } from "./oracle/OracleScene";

interface PulseCanvasProps {
  mode: "city" | "oracle";
  snapshot?: EnergySnapshot;
  derived?: DerivedEnergyState;
}

export function PulseCanvas({ mode, snapshot, derived }: PulseCanvasProps) {
  const background = mode === "oracle" ? "#080711" : "#11150f";

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [8, 8, 10], fov: 48, near: 0.1, far: 90 }}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[background]} />
        <fog attach="fog" args={[background, 18, 42]} />
        <Suspense fallback={null}>
          {mode === "city" ? (
            <CityScene snapshot={snapshot} derived={derived} />
          ) : (
            <OracleScene snapshot={snapshot} derived={derived} />
          )}
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={7}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.18}
        />
      </Canvas>
    </div>
  );
}
