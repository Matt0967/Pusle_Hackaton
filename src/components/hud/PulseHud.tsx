import {
  Activity,
  BatteryCharging,
  Bot,
  CalendarClock,
  CheckCircle2,
  CloudLightning,
  Gauge,
  HelpCircle,
  Leaf,
  Maximize2,
  Menu,
  Radio,
  Shield,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PulseAudioControls } from "../../audio/usePulseAudio";
import type { OracleVoiceControls } from "../../audio/useOracleVoice";
import { CITY_UPGRADES, upgradeCost } from "../../simulation/cityModel";
import { getNextFavorableWindow } from "../../simulation/forecastModel";
import { useCityStatus, usePulseStore } from "../../store/pulseStore";
import { formatMw, formatPercent, formatTime } from "../../utils/format";
import { DraggableHudPanel } from "./DraggableHudPanel";
import { TimelinePanel } from "./TimelinePanel";
import { TutorialOverlay } from "./TutorialOverlay";

interface PulseHudProps {
  audio: PulseAudioControls;
  oracleVoice: OracleVoiceControls;
  onOpenMenu: () => void;
}

export function PulseHud({ audio, oracleVoice, onOpenMenu }: PulseHudProps) {
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const mode = usePulseStore((state) => state.mode);
  const snapshot = usePulseStore((state) => state.snapshot);
  const derived = usePulseStore((state) => state.derived);
  const forecast = usePulseStore((state) => state.forecast);
  const player = usePulseStore((state) => state.player);
  const collective = usePulseStore((state) => state.collective);
  const activeQuest = usePulseStore((state) => state.activeQuest);
  const setMode = usePulseStore((state) => state.setMode);
  const completeQuest = usePulseStore((state) => state.completeQuest);
  const buyUpgrade = usePulseStore((state) => state.buyUpgrade);
  const dataError = usePulseStore((state) => state.dataError);
  const city = useCityStatus();

  useEffect(() => {
    if (hasSeenTutorial()) {
      return;
    }

    markTutorialSeen();
    setTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    markTutorialSeen();
    setTutorialOpen(false);
  }, []);
  const gameStateDefaultPosition = useCallback((viewport: { width: number }) => ({ x: 20, y: viewport.width < 760 ? 78 : 20 }), []);
  const gridStatsDefaultPosition = useCallback(
    (viewport: { width: number }) => ({
      x: viewport.width < 760 ? 16 : Math.max(16, viewport.width - 400),
      y: viewport.width < 760 ? 258 : 164,
    }),
    [],
  );
  const gridStatsDefaultCollapsed = useCallback((viewport: { width: number }) => viewport.width < 760, []);
  const nextFavorableWindow = getNextFavorableWindow(forecast);

  const enterOracleFullscreen = useCallback(() => {
    setMode("oracle");

    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    }
  }, [setMode]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-4 sm:p-5">
      <DraggableHudPanel
        storageId="game-state"
        title="Etat du jeu"
        tourId="game-state"
        className="w-[min(92vw,460px)]"
        defaultPosition={gameStateDefaultPosition}
      >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-pulse-cyan/15 text-pulse-cyan">
              <Activity size={21} />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-300">Pulse</div>
              <div className="text-lg font-semibold text-white">{derived?.moodLabel ?? "Initialisation du reseau"}</div>
            </div>
          </div>
          <div className="mt-3 text-sm leading-5 text-stone-300">{derived?.alertBody ?? "Synchronisation des signaux energetiques."}</div>
          {dataError ? <div className="mt-2 text-sm text-pulse-coral">{dataError}</div> : null}
      </DraggableHudPanel>

      <div
        className="pointer-events-auto fixed right-4 top-4 z-40 flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-black/35 p-1 shadow-hud backdrop-blur-md sm:right-5 sm:top-5"
        data-tour="toolbar"
      >
          <button
            className="hud-icon-button"
            type="button"
            onClick={onOpenMenu}
            aria-label="Ouvrir le menu"
            title="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>
          <button
            className={`hud-icon-button ${mode === "city" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("city")}
            aria-label="Mode citadelle"
            title="Mode citadelle"
          >
            <Zap size={18} />
          </button>
          <button
            className={`hud-icon-button ${mode === "oracle" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("oracle")}
            aria-label="Mode Oracle"
            title="Mode Oracle"
          >
            <Radio size={18} />
          </button>
          <button
            className={`hud-icon-button ${audio.enabled ? "is-active" : ""}`}
            type="button"
            onClick={audio.toggle}
            aria-label="Ambiance audio"
            title="Ambiance audio"
          >
            {audio.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className={`hud-icon-button ${oracleVoice.enabled ? "is-active" : ""}`}
            type="button"
            onClick={oracleVoice.toggle}
            disabled={!oracleVoice.supported}
            aria-label="Voix Oracle"
            title={oracleVoice.supported ? "Voix Oracle" : "Voix Oracle indisponible"}
          >
            <Bot size={18} />
          </button>
          <button
            className="hud-icon-button"
            type="button"
            onClick={enterOracleFullscreen}
            aria-label="Oracle plein ecran"
            title="Oracle plein ecran"
          >
            <Maximize2 size={18} />
          </button>
          <button
            className={`hud-icon-button ${timelineOpen ? "is-active" : ""}`}
            type="button"
            onClick={() => setTimelineOpen((current) => !current)}
            aria-label="Timeline 24 heures"
            title="Timeline 24 heures"
          >
            <CalendarClock size={18} />
          </button>
          <button
            className="hud-icon-button"
            type="button"
            onClick={() => setTutorialOpen(true)}
            aria-label="Revoir le tutoriel"
            title="Revoir le tutoriel"
          >
            <HelpCircle size={18} />
          </button>
      </div>

      {nextFavorableWindow && !timelineOpen ? (
        <button
          className="hud-panel pointer-events-auto fixed right-4 top-[4.75rem] z-30 flex max-w-[min(92vw,360px)] items-center gap-3 px-3 py-2 text-left sm:right-5"
          type="button"
          onClick={() => setTimelineOpen(true)}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-pulse-green/15 text-pulse-green">
            <Leaf size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse-green">Fenetre favorable</div>
            <div className="truncate text-sm text-stone-200">
              Vers {formatTime(nextFavorableWindow.timestamp)} · {nextFavorableWindow.reason}
            </div>
          </div>
        </button>
      ) : null}

      <TimelinePanel open={timelineOpen} forecast={forecast} onClose={() => setTimelineOpen(false)} />

      <DraggableHudPanel
        storageId="grid-stats"
        title="Reseau et bouclier"
        tourId="grid-stats"
        className="hud-stats-panel w-[min(92vw,380px)]"
        defaultCollapsed={gridStatsDefaultCollapsed}
        defaultPosition={gridStatsDefaultPosition}
      >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">
            <Gauge size={15} />
            Etat instantane
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={<Zap size={16} />} label="Conso" value={snapshot ? formatMw(snapshot.rte.consumptionMW) : "..."} />
            <Metric icon={<Leaf size={16} />} label="Renouv." value={derived ? formatPercent(derived.renewableShare) : "..."} />
            <Metric icon={<CloudLightning size={16} />} label="CO2" value={snapshot ? `${Math.round(snapshot.rte.co2gPerKwh)} g/kWh` : "..."} />
            <Metric icon={<Shield size={16} />} label="Ville" value={`${Math.round(city.vitality)} %`} />
          </div>
          <div className="mt-3 space-y-2">
            <Meter label="Saturation" value={derived?.saturation ?? 0} tone={toneFor(derived?.gridStress)} />
            <Meter label="Bouclier" value={city.shieldCharge / 100} tone="cyan" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-300">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/8 px-2 py-1">
              <Wind size={13} /> {snapshot ? formatPercent(snapshot.engie.windFleetLoadFactor) : "..."}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/8 px-2 py-1">
              <Sun size={13} /> {snapshot ? formatPercent(snapshot.engie.solarFleetLoadFactor) : "..."}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/8 px-2 py-1">
              <BatteryCharging size={13} /> {snapshot ? `${Math.round(snapshot.engie.storageLevelPct)} %` : "..."}
            </span>
            <span className="ml-auto text-stone-400">{snapshot ? formatTime(snapshot.rte.timestamp) : ""}</span>
          </div>
      </DraggableHudPanel>

      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-10 grid gap-3 sm:bottom-5 sm:left-5 sm:right-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <section className="hud-panel pointer-events-auto" data-tour="quest-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-pulse-amber">
                <CloudLightning size={16} />
                {derived?.alertTitle ?? "Signal en attente"}
              </div>
              <h1 className="mt-1 truncate text-xl font-semibold text-white">{activeQuest.title}</h1>
              <p className="mt-1 text-sm leading-5 text-stone-300">{activeQuest.gesture}</p>
            </div>
            <button className="hud-action-button" type="button" onClick={completeQuest} data-tour="quest-validate">
              <CheckCircle2 size={18} />
              Valider
            </button>
          </div>
          <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-4">
            <QuestReward label="Duree" value={`${activeQuest.durationMinutes} min`} />
            <QuestReward label="Gain" value={`+${activeQuest.rewardWatts} W civiques`} />
            <QuestReward label="Bouclier" value={`+${activeQuest.shieldReward} %`} />
            <QuestReward label="Impact" value={`~${activeQuest.estimatedKwhSaved.toFixed(2)} kWh`} />
          </div>
          <div className="mt-3 hidden gap-2 md:grid md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-md bg-white/[0.07] px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                <Users size={14} />
                {collective.districtName}
              </div>
              <Meter label={`${collective.members} veilleurs actifs`} value={collective.progressWatts / collective.targetWatts} tone="green" />
            </div>
            <div className="rounded-md bg-white/[0.07] px-3 py-2">
              <div className="text-xs text-stone-400">Impact estime</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {player.estimatedKwhSaved.toFixed(2)} kWh · {formatImpactCo2(player.estimatedCo2KgAvoided)}
              </div>
              <div className="mt-0.5 text-xs text-stone-400">{player.completedQuests} quetes validees</div>
            </div>
          </div>
        </section>

        <section className="hud-panel pointer-events-auto" data-tour="upgrades-panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-300">Upgrades</div>
            <div className="rounded-md bg-pulse-green/15 px-2 py-1 text-sm font-semibold text-pulse-green">{city.civicWatts} W</div>
          </div>
          <div className="grid gap-2">
            {CITY_UPGRADES.map((upgrade) => {
              const level = player.upgrades[upgrade.id];
              const cost = upgradeCost(upgrade, level);
              const disabled = level >= upgrade.maxLevel || player.civicWatts < cost;

              return (
                <button
                  key={upgrade.id}
                  className="upgrade-row"
                  type="button"
                  disabled={disabled}
                  onClick={() => buyUpgrade(upgrade.id)}
                  title={upgrade.description}
                  data-tour={upgrade.id === "solar-roofs" ? "upgrade-first" : undefined}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-left text-sm font-semibold text-white">{upgrade.label}</span>
                    <span className="block text-left text-xs text-stone-400">
                      niv. {level}/{upgrade.maxLevel}
                    </span>
                  </span>
                  <span className="text-sm text-pulse-cyan">{level >= upgrade.maxLevel ? "max" : `${cost} W`}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <TutorialOverlay
        open={tutorialOpen}
        onClose={closeTutorial}
        completedQuests={player.completedQuests}
        shieldCharge={city.shieldCharge}
        upgradeLevelTotal={Object.values(player.upgrades).reduce((total, level) => total + level, 0)}
        hasAffordableUpgrade={CITY_UPGRADES.some((upgrade) => {
          const level = player.upgrades[upgrade.id];
          return level < upgrade.maxLevel && player.civicWatts >= upgradeCost(upgrade, level);
        })}
      />
    </div>
  );
}

const TUTORIAL_STORAGE_KEY = "pulse:onboarding:v2";

function hasSeenTutorial() {
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function markTutorialSeen() {
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, new Date().toISOString());
  } catch {
    // If storage is unavailable, the tutorial still works for the current session.
  }
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.07] px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-stone-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "coral" | "cyan" }) {
  const color = {
    green: "bg-pulse-green",
    amber: "bg-pulse-amber",
    coral: "bg-pulse-coral",
    cyan: "bg-pulse-cyan",
  }[tone];

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-stone-400">
        <span>{label}</span>
        <span>{formatPercent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(value * 100, 100)}%` }} />
      </div>
    </div>
  );
}

function QuestReward({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.07] px-3 py-2">
      <div className="text-xs text-stone-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function formatImpactCo2(valueKg: number) {
  if (valueKg < 1) {
    return `${Math.round(valueKg * 1000)} gCO2 evites`;
  }

  return `${valueKg.toFixed(1)} kgCO2 evites`;
}

function toneFor(stress: string | undefined): "green" | "amber" | "coral" | "cyan" {
  if (stress === "critical") {
    return "coral";
  }

  if (stress === "strained") {
    return "amber";
  }

  if (stress === "green") {
    return "green";
  }

  return "cyan";
}
