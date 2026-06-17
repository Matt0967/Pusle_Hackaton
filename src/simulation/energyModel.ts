import type {
  DerivedEnergyState,
  EnergyForecastPoint,
  EnergySnapshot,
  GridStress,
  PulseWeather,
} from "../domain/energy";
import { clamp } from "../utils/math";

function classifyStress(
  saturation: number,
  carbonPressure: number,
  forecastPressure: number,
  renewableShare: number,
): GridStress {
  const pressure = Math.max(saturation, carbonPressure, forecastPressure);

  if (pressure > 0.92 || (saturation > 0.86 && renewableShare < 0.3)) {
    return "critical";
  }

  if (pressure > 0.76 || carbonPressure > 0.68) {
    return "strained";
  }

  if (pressure > 0.58 || renewableShare < 0.28) {
    return "watch";
  }

  return "green";
}

function weatherFor(stress: GridStress, renewableShare: number, windLoad: number): PulseWeather {
  if (stress === "critical") {
    return "storm";
  }

  if (stress === "strained") {
    return "hazy";
  }

  if (windLoad > 0.55 || renewableShare > 0.5) {
    return "windy";
  }

  return "clear";
}

export function deriveEnergyState(snapshot: EnergySnapshot): DerivedEnergyState {
  const { rte, engie } = snapshot;
  const renewableMW = rte.hydroMW + rte.windMW + rte.solarMW + rte.bioenergyMW;
  const renewableShare = clamp(renewableMW / Math.max(rte.productionMW, 1), 0, 1);
  const saturation = clamp(rte.consumptionMW / Math.max(rte.capacityMW, 1), 0, 1.15);
  const forecastPressure = clamp(rte.forecastConsumptionMW / Math.max(rte.capacityMW, 1), 0, 1.15);
  const carbonPressure = clamp((rte.co2gPerKwh - 18) / 132, 0, 1);
  const gridStress = classifyStress(saturation, carbonPressure, forecastPressure, renewableShare);
  const weather = weatherFor(gridStress, renewableShare, engie.windFleetLoadFactor);

  const pressurePenalty = Math.max(saturation, carbonPressure, forecastPressure) * 62;
  const renewableBonus = renewableShare * 28;
  const cityHealthBase = clamp(88 + renewableBonus - pressurePenalty, 8, 100);

  return {
    renewableShare,
    saturation,
    forecastPressure,
    carbonPressure,
    gridStress,
    weather,
    cityHealthBase,
    moodLabel: moodFor(gridStress, cityHealthBase),
    alertTitle: alertTitleFor(gridStress),
    alertBody: alertBodyFor(gridStress, snapshot),
  };
}

export function classifyForecastPoint(point: Omit<EnergyForecastPoint, "stress">): GridStress {
  const saturation = clamp(point.consumptionMW / 72000, 0, 1.15);
  const carbonPressure = clamp((point.co2gPerKwh - 18) / 132, 0, 1);
  return classifyStress(saturation, carbonPressure, saturation, point.renewableShare);
}

function moodFor(stress: GridStress, health: number) {
  if (stress === "critical") {
    return "Citadelle sous tension";
  }

  if (stress === "strained") {
    return "Quartiers prudents";
  }

  if (health > 78) {
    return "Ville respirable";
  }

  return "Equilibre fragile";
}

function alertTitleFor(stress: GridStress) {
  if (stress === "critical") {
    return "Pic national detecte";
  }

  if (stress === "strained") {
    return "Reseau charge";
  }

  if (stress === "watch") {
    return "Vigilance energie";
  }

  return "Fenetre favorable";
}

function alertBodyFor(stress: GridStress, snapshot: EnergySnapshot) {
  if (stress === "critical") {
    return `La demande approche ${Math.round(snapshot.rte.consumptionMW / 1000)} GW. Les quartiers exposent leurs boucliers.`;
  }

  if (stress === "strained") {
    return `Le carbone monte a ${Math.round(snapshot.rte.co2gPerKwh)} gCO2/kWh. La ville ralentit sa croissance.`;
  }

  if (stress === "watch") {
    return "Le mix reste jouable, mais une action sobre donne un vrai avantage.";
  }

  return "Les renouvelables ouvrent une fenetre de construction propre.";
}
