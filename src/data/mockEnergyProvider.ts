import type { EnergyDataProvider } from "./EnergyDataProvider";
import type { EnergyForecastPoint, EnergyScenario, EnergySnapshot } from "../domain/energy";
import { classifyForecastPoint } from "../simulation/energyModel";
import { clamp } from "../utils/math";

export class MockEnergyDataProvider implements EnergyDataProvider {
  private tick = 0;

  async getCurrentSnapshot(): Promise<EnergySnapshot> {
    const point = this.createPoint(this.tick, new Date());
    this.tick += 1;
    return point;
  }

  async getForecast(hours: number): Promise<EnergyForecastPoint[]> {
    return Array.from({ length: hours }, (_, index) => {
      const futureDate = new Date(Date.now() + (index + 1) * 60 * 60 * 1000);
      const snapshot = this.createPoint(this.tick + index + 1, futureDate);
      const renewableShare =
        (snapshot.rte.hydroMW + snapshot.rte.windMW + snapshot.rte.solarMW + snapshot.rte.bioenergyMW) /
        snapshot.rte.productionMW;
      const point = {
        timestamp: snapshot.rte.timestamp,
        consumptionMW: snapshot.rte.consumptionMW,
        renewableShare: clamp(renewableShare, 0, 1),
        co2gPerKwh: snapshot.rte.co2gPerKwh,
      };

      return {
        ...point,
        stress: classifyForecastPoint(point),
      };
    });
  }

  private createPoint(tick: number, date: Date): EnergySnapshot {
    const acceleratedHour = (date.getHours() + date.getMinutes() / 60 + tick * 0.38) % 24;
    const scenario = scenarioFor(tick);
    const eveningPeak = gaussian(acceleratedHour, 19, 3);
    const morningPeak = gaussian(acceleratedHour, 8, 2.6);
    const solarCurve = clamp(Math.sin(((acceleratedHour - 6) / 13) * Math.PI), 0, 1);
    const windWave = 0.48 + Math.sin(tick * 0.73) * 0.22 + Math.cos(tick * 0.19) * 0.14;

    let consumptionMW = 44500 + eveningPeak * 15500 + morningPeak * 7200 + Math.sin(tick * 0.41) * 2200;
    let windMW = 7600 + windWave * 5400;
    let solarMW = 800 + solarCurve * 10300;
    let gasMW = 3600 + eveningPeak * 2600;
    let coalMW = 260 + eveningPeak * 420;

    if (scenario === "peak-alert") {
      consumptionMW += 10800;
      gasMW += 4200;
      coalMW += 950;
      windMW *= 0.72;
    }

    if (scenario === "renewable-surge") {
      solarMW *= 1.24;
      windMW *= 1.32;
      gasMW *= 0.62;
      coalMW *= 0.35;
    }

    if (scenario === "wind-lull") {
      windMW *= 0.32;
      gasMW += 2300;
      coalMW += 520;
    }

    const nuclearMW = 39200 + Math.sin(tick * 0.17) * 2100;
    const hydroMW = 6100 + Math.cos(tick * 0.27) * 1300;
    const bioenergyMW = 1150 + Math.sin(tick * 0.31) * 180;
    const productionMW = nuclearMW + hydroMW + windMW + solarMW + gasMW + coalMW + bioenergyMW;
    const balance = productionMW - consumptionMW;
    const importMW = Math.max(-balance, 0) * 0.65;
    const exportMW = Math.max(balance, 0) * 0.45;
    const fossilShare = (gasMW + coalMW) / Math.max(productionMW, 1);
    const co2gPerKwh = clamp(22 + fossilShare * 360 + (scenario === "peak-alert" ? 28 : 0), 18, 168);
    const capacityMW = 72500;

    return {
      source: "mock",
      scenario,
      rte: {
        timestamp: date.toISOString(),
        consumptionMW,
        forecastConsumptionMW: consumptionMW + 2500 + eveningPeak * 4800,
        capacityMW,
        productionMW,
        co2gPerKwh,
        nuclearMW,
        hydroMW,
        windMW,
        solarMW,
        gasMW,
        coalMW,
        bioenergyMW,
        importMW,
        exportMW,
      },
      engie: {
        timestamp: date.toISOString(),
        windFleetLoadFactor: clamp(windMW / 14500, 0, 1),
        solarFleetLoadFactor: clamp(solarMW / 12600, 0, 1),
        storageLevelPct: clamp(58 + Math.cos(tick * 0.21) * 19 - eveningPeak * 8, 18, 96),
        flexibilitySignal: clamp((consumptionMW - 50000) / 24000 + fossilShare * 0.4, 0, 1),
        districtHeatDemandMW: 4200 + morningPeak * 1400 + eveningPeak * 1800,
      },
    };
  }
}

function scenarioFor(tick: number): EnergyScenario {
  const phase = Math.floor(tick / 5) % 4;

  if (phase === 1) {
    return "peak-alert";
  }

  if (phase === 2) {
    return "renewable-surge";
  }

  if (phase === 3) {
    return "wind-lull";
  }

  return "baseline";
}

function gaussian(value: number, mean: number, spread: number) {
  return Math.exp(-((value - mean) ** 2) / (2 * spread ** 2));
}
