import type { EnergyDataProvider } from "./EnergyDataProvider";
import { MockEnergyDataProvider } from "./mockEnergyProvider";
import type { EnergyForecastPoint, EnergySnapshot } from "../domain/energy";

export class EdgeEnergyDataProvider implements EnergyDataProvider {
  constructor(private readonly fallback = new MockEnergyDataProvider()) {}

  async getCurrentSnapshot(): Promise<EnergySnapshot> {
    return fetchWithFallback("/api/energy", () => this.fallback.getCurrentSnapshot());
  }

  async getForecast(hours: number): Promise<EnergyForecastPoint[]> {
    return fetchWithFallback(`/api/forecast?hours=${hours}`, () => this.fallback.getForecast(hours));
  }
}

async function fetchWithFallback<T>(path: string, fallback: () => Promise<T>): Promise<T> {
  try {
    const response = await fetch(path, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(`Provider edge indisponible sur ${path}. Fallback mock.`, error);
    return fallback();
  }
}
