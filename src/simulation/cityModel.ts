import type { CityStatus, CityUpgradeDefinition, PlayerCityState, UpgradeId } from "../domain/city";
import type { DerivedEnergyState } from "../domain/energy";
import { clamp } from "../utils/math";

export const INITIAL_PLAYER_CITY: PlayerCityState = {
  civicWatts: 80,
  shieldCharge: 18,
  completedQuests: 0,
  upgrades: {
    "solar-roofs": 0,
    insulation: 0,
    "urban-gardens": 0,
    "battery-loop": 0,
  },
};

export const CITY_UPGRADES: CityUpgradeDefinition[] = [
  {
    id: "solar-roofs",
    label: "Toits solaires",
    description: "Transforme les heures claires en bonus de stabilite.",
    cost: 55,
    maxLevel: 3,
  },
  {
    id: "insulation",
    label: "Isolation",
    description: "Reduit l'impact des pics de consommation.",
    cost: 65,
    maxLevel: 3,
  },
  {
    id: "urban-gardens",
    label: "Jardins frais",
    description: "Absorbe une partie des malus carbone.",
    cost: 45,
    maxLevel: 4,
  },
  {
    id: "battery-loop",
    label: "Boucle batterie",
    description: "Renforce le bouclier pendant les alertes.",
    cost: 85,
    maxLevel: 2,
  },
];

export function computeCityStatus(
  derived: DerivedEnergyState | undefined,
  player: PlayerCityState,
): CityStatus {
  const upgradeResilience =
    player.upgrades["solar-roofs"] * 4 +
    player.upgrades.insulation * 7 +
    player.upgrades["urban-gardens"] * 5 +
    player.upgrades["battery-loop"] * 8;
  const shieldResilience = player.shieldCharge * 0.28;
  const resilience = clamp(upgradeResilience + shieldResilience, 0, 55);
  const base = derived?.cityHealthBase ?? 72;
  const vitality = clamp(base + resilience - stressTax(derived), 0, 100);

  return {
    vitality,
    resilience,
    civicWatts: player.civicWatts,
    shieldCharge: player.shieldCharge,
  };
}

export function upgradeCost(definition: CityUpgradeDefinition, level: number) {
  return Math.round(definition.cost * (1 + level * 0.7));
}

export function canBuyUpgrade(player: PlayerCityState, upgradeId: UpgradeId) {
  const definition = CITY_UPGRADES.find((upgrade) => upgrade.id === upgradeId);

  if (!definition) {
    return false;
  }

  const level = player.upgrades[upgradeId];
  return level < definition.maxLevel && player.civicWatts >= upgradeCost(definition, level);
}

function stressTax(derived: DerivedEnergyState | undefined) {
  if (!derived) {
    return 0;
  }

  if (derived.gridStress === "critical") {
    return 12;
  }

  if (derived.gridStress === "strained") {
    return 6;
  }

  return 0;
}
