import type { EnergyForecastPoint, EnergySnapshot } from "../domain/energy";

export interface EnergyDataProvider {
  getCurrentSnapshot(): Promise<EnergySnapshot>;
  getForecast(hours: number): Promise<EnergyForecastPoint[]>;
}
