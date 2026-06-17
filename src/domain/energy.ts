export type GridStress = "green" | "watch" | "strained" | "critical";

export type PulseWeather = "clear" | "windy" | "hazy" | "storm";

export type EnergyScenario =
  | "baseline"
  | "peak-alert"
  | "renewable-surge"
  | "wind-lull";

export interface Eco2mixSnapshot {
  timestamp: string;
  consumptionMW: number;
  forecastConsumptionMW: number;
  capacityMW: number;
  productionMW: number;
  co2gPerKwh: number;
  nuclearMW: number;
  hydroMW: number;
  windMW: number;
  solarMW: number;
  gasMW: number;
  coalMW: number;
  bioenergyMW: number;
  importMW: number;
  exportMW: number;
}

export interface EngieSignalSnapshot {
  timestamp: string;
  windFleetLoadFactor: number;
  solarFleetLoadFactor: number;
  storageLevelPct: number;
  flexibilitySignal: number;
  districtHeatDemandMW: number;
}

export interface EnergySnapshot {
  source: "mock" | "live";
  scenario: EnergyScenario;
  rte: Eco2mixSnapshot;
  engie: EngieSignalSnapshot;
}

export interface EnergyForecastPoint {
  timestamp: string;
  consumptionMW: number;
  renewableShare: number;
  co2gPerKwh: number;
  stress: GridStress;
}

export interface DerivedEnergyState {
  renewableShare: number;
  saturation: number;
  forecastPressure: number;
  carbonPressure: number;
  gridStress: GridStress;
  weather: PulseWeather;
  cityHealthBase: number;
  moodLabel: string;
  alertTitle: string;
  alertBody: string;
}
