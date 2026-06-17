export type UpgradeId = "solar-roofs" | "insulation" | "urban-gardens" | "battery-loop";

export interface PlayerCityState {
  civicWatts: number;
  shieldCharge: number;
  completedQuests: number;
  upgrades: Record<UpgradeId, number>;
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
  trigger: "carbon" | "peak" | "renewable" | "sobriety";
}
