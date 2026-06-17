export type UpgradeId = "solar-roofs" | "insulation" | "urban-gardens" | "battery-loop";

export interface PlayerCityState {
  civicWatts: number;
  shieldCharge: number;
  completedQuests: number;
  estimatedKwhSaved: number;
  estimatedCo2KgAvoided: number;
  questLog: QuestImpactEntry[];
  upgrades: Record<UpgradeId, number>;
}

export interface QuestImpactEntry {
  id: string;
  title: string;
  completedAt: string;
  estimatedKwhSaved: number;
  estimatedCo2KgAvoided: number;
}

export interface CollectiveQuestState {
  districtName: string;
  targetWatts: number;
  progressWatts: number;
  stability: number;
  members: number;
  lastPulseAt?: string;
}

export interface CityUpgradeDefinition {
  id: UpgradeId;
  label: string;
  description: string;
  cost: number;
  maxLevel: number;
}

export interface CityStatus {
  vitality: number;
  resilience: number;
  civicWatts: number;
  shieldCharge: number;
}

export interface QuestDefinition {
  id: string;
  title: string;
  gesture: string;
  durationMinutes: number;
  rewardWatts: number;
  shieldReward: number;
  estimatedKwhSaved: number;
  trigger: "carbon" | "peak" | "renewable" | "sobriety";
}
