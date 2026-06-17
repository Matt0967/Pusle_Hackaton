import type { QuestDefinition } from "../domain/city";
import type { DerivedEnergyState, EnergyForecastPoint } from "../domain/energy";

export const QUESTS: QuestDefinition[] = [
  {
    id: "standby-hunt",
    title: "Chasse aux veilles",
    gesture: "Coupe les appareils en veille pendant une heure.",
    durationMinutes: 60,
    rewardWatts: 35,
    shieldReward: 20,
    trigger: "peak",
  },
  {
    id: "cold-cycle",
    title: "Cycle froid",
    gesture: "Decale lave-linge ou lave-vaisselle hors du pic.",
    durationMinutes: 90,
    rewardWatts: 45,
    shieldReward: 24,
    trigger: "peak",
  },
  {
    id: "low-carbon-window",
    title: "Fenetre bas carbone",
    gesture: "Lance une tache utile maintenant, le mix est favorable.",
    durationMinutes: 30,
    rewardWatts: 28,
    shieldReward: 10,
    trigger: "renewable",
  },
  {
    id: "heat-truce",
    title: "Treve thermique",
    gesture: "Baisse chauffage ou climatisation d'un cran.",
    durationMinutes: 60,
    rewardWatts: 42,
    shieldReward: 26,
    trigger: "carbon",
  },
  {
    id: "quiet-hour",
    title: "Heure sobre",
    gesture: "Regroupe les usages lourds et garde une heure legere.",
    durationMinutes: 60,
    rewardWatts: 30,
    shieldReward: 14,
    trigger: "sobriety",
  },
];

export function selectQuest(
  derived: DerivedEnergyState | undefined,
  forecast: EnergyForecastPoint[],
): QuestDefinition {
  const upcomingCritical = forecast.some((point) => point.stress === "critical");
  const upcomingGreen = forecast.some((point) => point.renewableShare > 0.52 && point.co2gPerKwh < 45);

  if (derived?.gridStress === "critical" || upcomingCritical) {
    return QUESTS[0];
  }

  if ((derived?.carbonPressure ?? 0) > 0.62) {
    return QUESTS[3];
  }

  if (derived?.gridStress === "strained") {
    return QUESTS[1];
  }

  if (upcomingGreen || (derived?.renewableShare ?? 0) > 0.48) {
    return QUESTS[2];
  }

  return QUESTS[4];
}
