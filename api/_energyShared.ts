import type {
  Eco2mixSnapshot,
  EnergyForecastPoint,
  EnergyScenario,
  EnergySnapshot,
  EngieSignalSnapshot,
  GridStress,
} from "../src/domain/energy";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();
const ECO2MIX_DATASET_URL = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-national-tr/records";
const SNAPSHOT_TTL_MS = 4 * 60 * 1000;
const FORECAST_TTL_MS = 12 * 60 * 1000;
const DEFAULT_CAPACITY_MW = 72_500;

export async function getCachedEnergySnapshot() {
  return withCache("energy:snapshot", SNAPSHOT_TTL_MS, fetchEnergySnapshot);
}

export async function getCachedForecast(hours: number) {
  const safeHours = Math.min(Math.max(Math.round(hours), 1), 24);
  return withCache(`energy:forecast:${safeHours}`, FORECAST_TTL_MS, async () => {
    const snapshot = await getCachedEnergySnapshot();
    return buildForecast(snapshot, safeHours);
  });
}

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "s-maxage=240, stale-while-revalidate=600",
      "access-control-allow-origin": "*",
    },
  });
}

async function withCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > Date.now()) {
    return existing.value;
  }

  const value = await loader();
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

async function fetchEnergySnapshot(): Promise<EnergySnapshot> {
  const latestRecord = await fetchLatestEco2mixRecord();
  const rte = normalizeEco2mixRecord(latestRecord);
  const engie = await fetchEngieSignals(rte);

  return {
    source: "live",
    scenario: scenarioFor(rte, engie),
    rte,
    engie,
  };
}

async function fetchLatestEco2mixRecord() {
  const url = new URL(ECO2MIX_DATASET_URL);
  url.searchParams.set("limit", "1");
  url.searchParams.set("order_by", "date_heure desc");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Eco2mix request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { results?: unknown[]; records?: Array<{ fields?: unknown }> };
  const record = payload.results?.[0] ?? payload.records?.[0]?.fields;

  if (!record || typeof record !== "object") {
    throw new Error("Eco2mix response did not contain a usable record");
  }

  return record as Record<string, unknown>;
}

function normalizeEco2mixRecord(record: Record<string, unknown>): Eco2mixSnapshot {
  const timestamp = readString(record, ["date_heure", "datetime", "date"]) ?? new Date().toISOString();
  const nuclearMW = readNumber(record, ["nucleaire", "nuclear"], 0);
  const hydroMW = readNumber(record, ["hydraulique", "hydro"], 0);
  const windMW = readNumber(record, ["eolien", "wind"], 0);
  const solarMW = readNumber(record, ["solaire", "solar"], 0);
  const gasMW = readNumber(record, ["gaz", "gas"], 0);
  const coalMW = readNumber(record, ["charbon", "coal"], 0);
  const bioenergyMW = readNumber(record, ["bioenergies", "bioenergie", "bioenergy"], 0);
  const productionMW = nuclearMW + hydroMW + windMW + solarMW + gasMW + coalMW + bioenergyMW;
  const consumptionMW = readNumber(record, ["consommation", "consumption"], Math.max(productionMW * 0.92, 1));
  const forecastConsumptionMW = readNumber(
    record,
    ["prevision_j1", "prevision_j", "prevision", "forecast_consumption"],
    consumptionMW,
  );
  const importMW = readNumber(record, ["echanges_import", "import", "imports"], 0);
  const exportMW = readNumber(record, ["echanges_export", "export", "exports"], 0);
  const co2Fallback = estimateCo2(gasMW, coalMW, productionMW);
  const co2gPerKwh = readNumber(record, ["taux_co2", "co2", "co2g_per_kwh"], co2Fallback);

  return {
    timestamp,
    consumptionMW,
    forecastConsumptionMW,
    capacityMW: DEFAULT_CAPACITY_MW,
    productionMW: Math.max(productionMW, consumptionMW),
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
  };
}

async function fetchEngieSignals(rte: Eco2mixSnapshot): Promise<EngieSignalSnapshot> {
  const [windLoad, solarLoad, storageLevel, siteConsumption] = await Promise.all([
    fetchOptionalMetric("ENGIE_WIND_URL"),
    fetchOptionalMetric("ENGIE_SOLAR_URL"),
    fetchOptionalMetric("ENGIE_STORAGE_URL"),
    fetchOptionalMetric("ENGIE_SITE_CONSUMPTION_URL"),
  ]);

  const windFleetLoadFactor = normalizeRatio(windLoad, rte.windMW / 15_000);
  const solarFleetLoadFactor = normalizeRatio(solarLoad, rte.solarMW / 13_000);
  const storageLevelPct = normalizePercent(storageLevel, 54 + solarFleetLoadFactor * 24 - rte.consumptionMW / 6000);
  const flexibilitySignal = clamp((rte.consumptionMW - 48_000) / 24_000 + rte.co2gPerKwh / 300, 0, 1);

  return {
    timestamp: new Date().toISOString(),
    windFleetLoadFactor,
    solarFleetLoadFactor,
    storageLevelPct,
    flexibilitySignal,
    districtHeatDemandMW: Math.max(siteConsumption ?? rte.consumptionMW * 0.075, 0),
  };
}

async function fetchOptionalMetric(envName: string) {
  const url = readEnv(envName);

  if (!url) {
    return undefined;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    return findFirstNumber(await response.json());
  } catch {
    return undefined;
  }
}

function buildForecast(snapshot: EnergySnapshot, hours: number): EnergyForecastPoint[] {
  const baseHour = new Date(snapshot.rte.timestamp).getHours();

  return Array.from({ length: hours }, (_, index) => {
    const hour = (baseHour + index + 1) % 24;
    const date = new Date(Date.now() + (index + 1) * 60 * 60 * 1000);
    const eveningPeak = gaussian(hour, 19, 3.2);
    const morningPeak = gaussian(hour, 8, 2.8);
    const solarCurve = clamp(Math.sin(((hour - 6) / 13) * Math.PI), 0, 1);
    const windPulse = 0.88 + Math.sin(index * 0.7 + snapshot.engie.windFleetLoadFactor * 3) * 0.14;
    const consumptionMW = snapshot.rte.consumptionMW * (0.88 + eveningPeak * 0.22 + morningPeak * 0.12);
    const renewableShare = clamp(
      snapshot.rte.hydroMW / snapshot.rte.productionMW +
        (snapshot.rte.windMW * windPulse) / snapshot.rte.productionMW +
        (snapshot.rte.solarMW * (0.28 + solarCurve)) / snapshot.rte.productionMW +
        snapshot.rte.bioenergyMW / snapshot.rte.productionMW,
      0,
      0.85,
    );
    const co2gPerKwh = clamp(
      snapshot.rte.co2gPerKwh + eveningPeak * 28 + morningPeak * 12 - solarCurve * 18 - (windPulse - 0.88) * 35,
      12,
      190,
    );
    const point = {
      timestamp: date.toISOString(),
      consumptionMW,
      renewableShare,
      co2gPerKwh,
    };

    return {
      ...point,
      stress: classifyForecastPoint(point),
    };
  });
}

function classifyForecastPoint(point: Omit<EnergyForecastPoint, "stress">): GridStress {
  const saturation = clamp(point.consumptionMW / DEFAULT_CAPACITY_MW, 0, 1.15);
  const carbonPressure = clamp((point.co2gPerKwh - 18) / 132, 0, 1);
  const pressure = Math.max(saturation, carbonPressure);

  if (pressure > 0.92 || (saturation > 0.86 && point.renewableShare < 0.3)) {
    return "critical";
  }

  if (pressure > 0.76 || carbonPressure > 0.68) {
    return "strained";
  }

  if (pressure > 0.58 || point.renewableShare < 0.28) {
    return "watch";
  }

  return "green";
}

function scenarioFor(rte: Eco2mixSnapshot, engie: EngieSignalSnapshot): EnergyScenario {
  const renewableShare = (rte.hydroMW + rte.windMW + rte.solarMW + rte.bioenergyMW) / Math.max(rte.productionMW, 1);

  if (rte.consumptionMW / rte.capacityMW > 0.86 || rte.co2gPerKwh > 110) {
    return "peak-alert";
  }

  if (renewableShare > 0.48) {
    return "renewable-surge";
  }

  if (engie.windFleetLoadFactor < 0.18) {
    return "wind-lull";
  }

  return "baseline";
}

function readNumber(record: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function readEnv(name: string) {
  const runtime = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  return runtime.process?.env?.[name];
}

function normalizeRatio(value: number | undefined, fallback: number) {
  if (value === undefined) {
    return clamp(fallback, 0, 1);
  }

  return clamp(value > 1 ? value / 100 : value, 0, 1);
}

function normalizePercent(value: number | undefined, fallback: number) {
  if (value === undefined) {
    return clamp(fallback, 0, 100);
  }

  return clamp(value <= 1 ? value * 100 : value, 0, 100);
}

function findFirstNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstNumber(item);

      if (found !== undefined) {
        return found;
      }
    }
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = findFirstNumber(item);

      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

function estimateCo2(gasMW: number, coalMW: number, productionMW: number) {
  const fossilShare = (gasMW + coalMW) / Math.max(productionMW, 1);
  return clamp(22 + fossilShare * 380, 18, 190);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function gaussian(value: number, mean: number, spread: number) {
  return Math.exp(-((value - mean) ** 2) / (2 * spread ** 2));
}
