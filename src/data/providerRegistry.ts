import type { EnergyDataProvider } from "./EnergyDataProvider";
import { EdgeEnergyDataProvider } from "./edgeEnergyProvider";
import { MockEnergyDataProvider } from "./mockEnergyProvider";

export function createEnergyProvider(): EnergyDataProvider {
  const mode = import.meta.env.VITE_DATA_MODE ?? "mock";

  if (mode === "edge" || mode === "live") {
    return new EdgeEnergyDataProvider();
  }

  return new MockEnergyDataProvider();
}
