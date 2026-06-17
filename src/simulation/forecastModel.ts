import type { EnergyForecastPoint } from "../domain/energy";

export interface FavorableWindow {
  timestamp: string;
  score: number;
  reason: string;
  point: EnergyForecastPoint;
}

export interface RiskWindow {
  timestamp: string;
  severity: "surveillance" | "pic";
  point: EnergyForecastPoint;
}

export function selectFavorableWindows(forecast: EnergyForecastPoint[], limit = 4): FavorableWindow[] {
  return forecast
    .filter((point) => point.stress === "green" || (point.renewableShare >= 0.48 && point.co2gPerKwh <= 58))
    .map((point) => {
      const renewableScore = point.renewableShare * 55;
      const carbonScore = Math.max(0, 70 - point.co2gPerKwh) * 0.7;
      const stressBonus = point.stress === "green" ? 18 : 6;

      return {
        timestamp: point.timestamp,
        score: Math.round(renewableScore + carbonScore + stressBonus),
        reason: point.renewableShare > 0.5 ? "Mix renouvelable fort" : "Carbone modere",
        point,
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(0, limit);
}

export function selectRiskWindows(forecast: EnergyForecastPoint[], limit = 3): RiskWindow[] {
  return forecast
    .filter((point) => point.stress === "strained" || point.stress === "critical")
    .map((point) => ({
      timestamp: point.timestamp,
      severity: point.stress === "critical" ? ("pic" as const) : ("surveillance" as const),
      point,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(0, limit);
}

export function getNextFavorableWindow(forecast: EnergyForecastPoint[]) {
  return selectFavorableWindows(forecast, 1)[0];
}
