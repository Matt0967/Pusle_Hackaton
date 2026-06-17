import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CollectiveQuestState, PlayerCityState, QuestDefinition, QuestImpactEntry, UpgradeId } from "../domain/city";
import type { DerivedEnergyState, EnergyForecastPoint, EnergySnapshot } from "../domain/energy";
import { createEnergyProvider } from "../data/providerRegistry";
import {
  computeCityStatus,
  INITIAL_COLLECTIVE_QUEST,
  INITIAL_PLAYER_CITY,
  CITY_UPGRADES,
  upgradeCost,
} from "../simulation/cityModel";
import { deriveEnergyState } from "../simulation/energyModel";
import { selectQuest } from "../simulation/questModel";
import { clamp } from "../utils/math";

type PulseMode = "city" | "oracle";

interface PulseStore {
  mode: PulseMode;
  snapshot?: EnergySnapshot;
  derived?: DerivedEnergyState;
  forecast: EnergyForecastPoint[];
  player: PlayerCityState;
  collective: CollectiveQuestState;
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

export const usePulseStore = create<PulseStore>()(
  persist(
    (set, get) => ({
      mode: "city",
      forecast: [],
      player: INITIAL_PLAYER_CITY,
      collective: INITIAL_COLLECTIVE_QUEST,
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
          const forecast = await provider.getForecast(24);
          const activeQuest = selectQuest(get().derived, forecast);
          set({ forecast, activeQuest, dataError: undefined });
        } catch (error) {
          set({ dataError: error instanceof Error ? error.message : "Erreur de prevision inconnue" });
        }
      },
      completeQuest: () => {
        const { activeQuest, collective, player, snapshot } = get();
        const completedAt = new Date().toISOString();
        const estimatedCo2KgAvoided = estimateCo2AvoidedKg(activeQuest.estimatedKwhSaved, snapshot);
        const entry: QuestImpactEntry = {
          id: activeQuest.id,
          title: activeQuest.title,
          completedAt,
          estimatedKwhSaved: activeQuest.estimatedKwhSaved,
          estimatedCo2KgAvoided,
        };
        const nextProgress = Math.min(collective.progressWatts + activeQuest.rewardWatts, collective.targetWatts);

        set({
          player: {
            ...player,
            civicWatts: player.civicWatts + activeQuest.rewardWatts,
            shieldCharge: clamp(player.shieldCharge + activeQuest.shieldReward, 0, 100),
            completedQuests: player.completedQuests + 1,
            estimatedKwhSaved: roundImpact(player.estimatedKwhSaved + activeQuest.estimatedKwhSaved),
            estimatedCo2KgAvoided: roundImpact(player.estimatedCo2KgAvoided + estimatedCo2KgAvoided),
            questLog: [entry, ...player.questLog].slice(0, 7),
          },
          collective: {
            ...collective,
            progressWatts: nextProgress,
            stability: clamp(collective.stability + activeQuest.rewardWatts / 18 + activeQuest.shieldReward * 0.18, 0, 100),
            lastPulseAt: completedAt,
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
    }),
    {
      name: "pulse:citadel:v2",
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        player: state.player,
        collective: state.collective,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<Pick<PulseStore, "player" | "collective">>;

        return {
          ...current,
          player: hydratePlayer(saved.player),
          collective: hydrateCollective(saved.collective),
        };
      },
    },
  ),
);

export function useCityStatus() {
  const derived = usePulseStore((state) => state.derived);
  const player = usePulseStore((state) => state.player);

  return useMemo(() => computeCityStatus(derived, player), [derived, player]);
}

function estimateCo2AvoidedKg(estimatedKwhSaved: number, snapshot: EnergySnapshot | undefined) {
  const gridCarbon = snapshot?.rte.co2gPerKwh ?? 65;
  return roundImpact((estimatedKwhSaved * gridCarbon) / 1000);
}

function roundImpact(value: number) {
  return Math.round(value * 1000) / 1000;
}

function hydratePlayer(saved: PlayerCityState | undefined): PlayerCityState {
  return {
    ...INITIAL_PLAYER_CITY,
    ...saved,
    upgrades: {
      ...INITIAL_PLAYER_CITY.upgrades,
      ...saved?.upgrades,
    },
    questLog: saved?.questLog ?? INITIAL_PLAYER_CITY.questLog,
    estimatedKwhSaved: saved?.estimatedKwhSaved ?? 0,
    estimatedCo2KgAvoided: saved?.estimatedCo2KgAvoided ?? 0,
  };
}

function hydrateCollective(saved: CollectiveQuestState | undefined): CollectiveQuestState {
  return {
    ...INITIAL_COLLECTIVE_QUEST,
    ...saved,
  };
}
