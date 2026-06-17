import { useCallback, useEffect, useRef, useState } from "react";
import type { DerivedEnergyState, EnergySnapshot } from "../domain/energy";
import { clamp } from "../utils/math";

interface PulseAudioEngine {
  context: AudioContext;
  master: GainNode;
  wind: OscillatorNode;
  solar: OscillatorNode;
  bass: OscillatorNode;
  filter: BiquadFilterNode;
}

export interface PulseAudioControls {
  enabled: boolean;
  toggle: () => void;
}

export function usePulseAudio(
  snapshot: EnergySnapshot | undefined,
  derived: DerivedEnergyState | undefined,
): PulseAudioControls {
  const [enabled, setEnabled] = useState(false);
  const engineRef = useRef<PulseAudioEngine | null>(null);

  const toggle = useCallback(() => {
    setEnabled((current) => !current);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopEngine(engineRef.current);
      engineRef.current = null;
      return;
    }

    if (!engineRef.current) {
      engineRef.current = createEngine();
    }

    void engineRef.current.context.resume();

    return () => {
      stopEngine(engineRef.current);
      engineRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !engineRef.current || !snapshot || !derived) {
      return;
    }

    updateEngine(engineRef.current, snapshot, derived);
  }, [enabled, snapshot, derived]);

  return { enabled, toggle };
}

function createEngine(): PulseAudioEngine {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextConstructor();
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const wind = context.createOscillator();
  const solar = context.createOscillator();
  const bass = context.createOscillator();
  const windGain = context.createGain();
  const solarGain = context.createGain();
  const bassGain = context.createGain();

  master.gain.value = 0.045;
  filter.type = "lowpass";
  filter.frequency.value = 900;
  wind.type = "sine";
  solar.type = "triangle";
  bass.type = "sawtooth";
  wind.frequency.value = 180;
  solar.frequency.value = 330;
  bass.frequency.value = 82;
  windGain.gain.value = 0.2;
  solarGain.gain.value = 0.12;
  bassGain.gain.value = 0.08;

  wind.connect(windGain).connect(filter);
  solar.connect(solarGain).connect(filter);
  bass.connect(bassGain).connect(filter);
  filter.connect(master).connect(context.destination);
  wind.start();
  solar.start();
  bass.start();

  return { context, master, wind, solar, bass, filter };
}

function updateEngine(engine: PulseAudioEngine, snapshot: EnergySnapshot, derived: DerivedEnergyState) {
  const now = engine.context.currentTime;
  const wind = snapshot.engie.windFleetLoadFactor;
  const solar = snapshot.engie.solarFleetLoadFactor;
  const stress = derived.gridStress === "critical" ? 1 : derived.gridStress === "strained" ? 0.7 : 0.25;

  engine.master.gain.linearRampToValueAtTime(0.035 + solar * 0.03 + wind * 0.018, now + 0.5);
  engine.wind.frequency.linearRampToValueAtTime(120 + wind * 420, now + 0.7);
  engine.solar.frequency.linearRampToValueAtTime(220 + solar * 540, now + 0.7);
  engine.bass.frequency.linearRampToValueAtTime(58 + stress * 46, now + 0.7);
  engine.filter.frequency.linearRampToValueAtTime(520 + solar * 1600 - stress * 260, now + 0.7);
  engine.filter.Q.linearRampToValueAtTime(clamp(0.6 + stress * 5, 0.6, 5.6), now + 0.7);
}

function stopEngine(engine: PulseAudioEngine | null) {
  if (!engine) {
    return;
  }

  engine.master.gain.setTargetAtTime(0, engine.context.currentTime, 0.05);
  window.setTimeout(() => {
    engine.wind.stop();
    engine.solar.stop();
    engine.bass.stop();
    void engine.context.close();
  }, 120);
}
