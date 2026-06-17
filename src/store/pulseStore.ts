import { useMemo } from "react";
import { create } from "zustand";
import type { QuestDefinition, UpgradeId } from "../domain/city";
import type { DerivedEnergyState, EnergyForecastPoint, EnergySnapshot } from "../domain/energy";
import { createEnergyProvider } from "../data/providerRegistry";
import { computeCityStatus, INITIAL_PLAYER_CITY, CITY_UPGRADES, upgradeCost } from "../simulation/cityModel";
import { deriveEnergyState } from "../simulation/energyModel";
import { selectQuest } from "../simulation/questModel";
import { clamp } from "../utils/math";

type PulseMode = "city" | "oracle";

interface PulseStore {
  mode: PulseMode;
  snapshot?: EnergySnapshot;
  derived?: DerivedEnergyState;
  forecast: EnergyForecastPoint[];
  player: typeof INITIAL_PLAYER_CITY;
  activeQuest: QuestDefinition;
  lastUpdated?: string;
  dataError?: string;
  setMode: (mode: PulseMode) => void;
  refreshEnergy: () => Promise<void>;
  refreshForecast: () => Promise<void>;
  completeQuest: () => void;
  buyUpgrade: (upgradeId: UpgradeId) => void;
}

const provider = createEnergyProvider();

export const usePulseStore = create<PulseStore>((set, get) => ({
  mode: "city",
  forecast: [],
  player: INITIAL_PLAYER_CITY,
  activeQuest: selectQuest(undefined, []),
  setMode: (mode) => set({ mode }),
  refreshEnergy: async () => {
    try {
      const snapshot = await provider.getCurrentSnapshot();
      const derived = deriveEnergyState(snapshot);
      const activeQuest = selectQuest(derived, get().forecast);

      set({
        snapshot,
        derived,
        activeQuest,
        lastUpdated: snapshot.rte.timestamp,
        dataError: undefined,
      });
    } catch (error) {
      set({ dataError: error instanceof Error ? error.message : "Erreur de donnees inconnue" });
    }
  },
  refreshForecast: async () => {
    try {
      const forecast = await provider.getForecast(8);
      const activeQuest = selectQuest(get().derived, forecast);
      set({ forecast, activeQuest, dataError: undefined });
    } catch (error) {
      set({ dataError: error instanceof Error ? error.message : "Erreur de prevision inconnue" });
    }
  },
  completeQuest: () => {
    const { activeQuest, player } = get();

    set({
      player: {
        ...player,
        civicWatts: player.civicWatts + activeQuest.rewardWatts,
        shieldCharge: clamp(player.shieldCharge + activeQuest.shieldReward, 0, 100),
        completedQuests: player.completedQuests + 1,
      },
    });
  },
  buyUpgrade: (upgradeId) => {
    const { player } = get();
    const definition = CITY_UPGRADES.find((upgrade) => upgrade.id === upgradeId);

    if (!definition) {
      return;
    }

    const currentLevel = player.upgrades[upgradeId];
    const cost = upgradeCost(definition, currentLevel);

    if (currentLevel >= definition.maxLevel || player.civicWatts < cost) {
      return;
    }

    set({
      player: {
        ...player,
        civicWatts: player.civicWatts - cost,
        upgrades: {
          ...player.upgrades,
          [upgradeId]: currentLevel + 1,
        },
      },
    });
  },
}));

export function useCityStatus() {
  const derived = usePulseStore((state) => state.derived);
  const player = usePulseStore((state) => state.player);

  return useMemo(() => computeCityStatus(derived, player), [derived, player]);
}
