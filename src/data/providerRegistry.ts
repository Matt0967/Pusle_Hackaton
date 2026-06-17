import type { EnergyDataProvider } from "./EnergyDataProvider";
import { MockEnergyDataProvider } from "./mockEnergyProvider";

export function createEnergyProvider(): EnergyDataProvider {
  const mode = import.meta.env.VITE_DATA_MODE ?? "mock";

  if (mode !== "mock") {
    console.warn(`VITE_DATA_MODE=${mode} demande un provider live non implemente. Fallback mock.`);
  }

  return new MockEnergyDataProvider();
}
