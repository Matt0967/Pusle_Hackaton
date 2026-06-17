import { useEffect, useState } from "react";
import { PulseCanvas } from "./scene/PulseCanvas";
import { PulseHud } from "./components/hud/PulseHud";
import { usePulseAudio } from "./audio/usePulseAudio";
import { useOracleVoice } from "./audio/useOracleVoice";
import { usePulseStore } from "./store/pulseStore";
import { MainMenu } from "./components/menu/MainMenu";

export default function App() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const mode = usePulseStore((state) => state.mode);
  const snapshot = usePulseStore((state) => state.snapshot);
  const derived = usePulseStore((state) => state.derived);
  const forecast = usePulseStore((state) => state.forecast);
  const refreshEnergy = usePulseStore((state) => state.refreshEnergy);
  const refreshForecast = usePulseStore((state) => state.refreshForecast);
  const audio = usePulseAudio(snapshot, derived);
  const oracleVoice = useOracleVoice(mode, snapshot, derived, forecast);

  useEffect(() => {
    void refreshEnergy();
    void refreshForecast();

    const snapshotTimer = window.setInterval(() => {
      void refreshEnergy();
    }, 6000);

    const forecastTimer = window.setInterval(() => {
      void refreshForecast();
    }, 30000);

    return () => {
      window.clearInterval(snapshotTimer);
      window.clearInterval(forecastTimer);
    };
  }, [refreshEnergy, refreshForecast]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10130f] text-stone-50">
      <PulseCanvas mode={mode} snapshot={snapshot} derived={derived} />
      {screen === "menu" ? (
        <MainMenu snapshot={snapshot} derived={derived} onStart={() => setScreen("game")} />
      ) : (
        <PulseHud audio={audio} oracleVoice={oracleVoice} onOpenMenu={() => setScreen("menu")} />
      )}
    </main>
  );
}
