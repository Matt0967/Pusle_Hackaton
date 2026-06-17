import { useCallback, useEffect, useRef, useState } from "react";
import type { DerivedEnergyState, EnergyForecastPoint, EnergySnapshot } from "../domain/energy";
import { getNextFavorableWindow } from "../simulation/forecastModel";
import { formatPercent, formatTime } from "../utils/format";

type PulseMode = "city" | "oracle";

export interface OracleVoiceControls {
  enabled: boolean;
  supported: boolean;
  toggle: () => void;
  speakNow: () => void;
}

interface OracleVoiceContext {
  mode: PulseMode;
  snapshot?: EnergySnapshot;
  derived?: DerivedEnergyState;
  forecast: EnergyForecastPoint[];
}

export function useOracleVoice(
  mode: PulseMode,
  snapshot: EnergySnapshot | undefined,
  derived: DerivedEnergyState | undefined,
  forecast: EnergyForecastPoint[],
): OracleVoiceControls {
  const [enabled, setEnabled] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const contextRef = useRef<OracleVoiceContext>({ mode, snapshot, derived, forecast });
  const lastSpokenRef = useRef<{ at: number; stress?: string }>({ at: 0 });
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  useEffect(() => {
    contextRef.current = { mode, snapshot, derived, forecast };
  }, [mode, snapshot, derived, forecast]);

  useEffect(() => {
    if (!supported) {
      return;
    }

    const syncVoices = () => setVoices(window.speechSynthesis.getVoices());
    syncVoices();
    window.speechSynthesis.addEventListener("voiceschanged", syncVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", syncVoices);
    };
  }, [supported]);

  const speakNow = useCallback(() => {
    if (!supported) {
      return;
    }

    const { derived: currentDerived, forecast: currentForecast, snapshot: currentSnapshot } = contextRef.current;
    const utterance = new SpeechSynthesisUtterance(composeOracleLine(currentSnapshot, currentDerived, currentForecast));
    const voice = pickVoice(voices);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.lang = voice?.lang ?? "fr-FR";
    utterance.pitch = 0.52;
    utterance.rate = 0.82;
    utterance.volume = 0.86;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = { at: Date.now(), stress: currentDerived?.gridStress };
  }, [supported, voices]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;

      if (!next && supported) {
        window.speechSynthesis.cancel();
      }

      if (next) {
        window.setTimeout(speakNow, 0);
      }

      return next;
    });
  }, [speakNow, supported]);

  useEffect(() => {
    if (!enabled || mode !== "oracle" || !supported) {
      return;
    }

    const last = lastSpokenRef.current;
    const stressChanged = derived?.gridStress && derived.gridStress !== last.stress;
    const stale = Date.now() - last.at > 26000;

    if (stressChanged || stale) {
      speakNow();
    }
  }, [derived?.gridStress, enabled, mode, speakNow, supported]);

  return { enabled, supported, toggle, speakNow };
}

function composeOracleLine(
  snapshot: EnergySnapshot | undefined,
  derived: DerivedEnergyState | undefined,
  forecast: EnergyForecastPoint[],
) {
  if (!snapshot || !derived) {
    return "Oracle en eveil. Les flux energetiques sont en cours de synchronisation.";
  }

  const nextWindow = getNextFavorableWindow(forecast);
  const stressLine = stressToOracleLine(derived.gridStress);
  const mixLine = `Renouvelables a ${formatPercent(derived.renewableShare)}. Carbone a ${Math.round(
    snapshot.rte.co2gPerKwh,
  )} grammes par kilowattheure.`;
  const storageLine = `Stockage Engie estime a ${Math.round(snapshot.engie.storageLevelPct)} pour cent.`;
  const windowLine = nextWindow
    ? `Fenetre favorable detectee vers ${formatTime(nextWindow.timestamp)}.`
    : "Aucune fenetre favorable stable dans l'horizon proche.";

  return `${stressLine} ${mixLine} ${storageLine} ${windowLine}`;
}

function stressToOracleLine(stress: DerivedEnergyState["gridStress"]) {
  if (stress === "critical") {
    return "Alerte rouge. La citadelle absorbe un pic national.";
  }

  if (stress === "strained") {
    return "Tension elevee. Les quartiers ralentissent pour garder le bouclier.";
  }

  if (stress === "watch") {
    return "Vigilance douce. Le reseau tient, mais chaque geste compte.";
  }

  return "Signal clair. La ville peut respirer et construire.";
}

function pickVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("fr") && /thomas|google|audrey|amelie/i.test(voice.name)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("fr")) ??
    voices[0]
  );
}
