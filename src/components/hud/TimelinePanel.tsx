import { BellRing, Leaf, ShieldAlert, X, Zap } from "lucide-react";
import { selectFavorableWindows, selectRiskWindows } from "../../simulation/forecastModel";
import { formatMw, formatPercent, formatTime } from "../../utils/format";
import type { EnergyForecastPoint } from "../../domain/energy";

interface TimelinePanelProps {
  open: boolean;
  forecast: EnergyForecastPoint[];
  onClose: () => void;
}

export function TimelinePanel({ open, forecast, onClose }: TimelinePanelProps) {
  if (!open) {
    return null;
  }

  const favorableWindows = selectFavorableWindows(forecast);
  const riskWindows = selectRiskWindows(forecast);
  const maxConsumption = Math.max(...forecast.map((point) => point.consumptionMW), 1);

  return (
    <section className="hud-panel pointer-events-auto fixed right-4 top-[4.75rem] z-30 max-h-[calc(100vh-6rem)] w-[min(94vw,520px)] overflow-y-auto p-4 sm:right-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
            <BellRing size={16} />
            Fenetres 24 h
          </div>
          <p className="mt-1 text-sm leading-5 text-stone-300">
            Planifie les usages lourds quand la courbe devient respirable.
          </p>
        </div>
        <button className="hud-icon-button shrink-0" type="button" onClick={onClose} aria-label="Fermer la timeline">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-white/[0.07] p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-pulse-green">
            <Leaf size={15} />
            Favorable
          </div>
          <div className="space-y-2">
            {favorableWindows.length > 0 ? (
              favorableWindows.map((window) => (
                <WindowRow key={window.timestamp} label={formatTime(window.timestamp)} detail={window.reason} value={`${window.score}`} />
              ))
            ) : (
              <div className="text-sm text-stone-400">Aucune fenetre nette dans les prochaines heures.</div>
            )}
          </div>
        </div>

        <div className="rounded-md bg-white/[0.07] p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-pulse-coral">
            <ShieldAlert size={15} />
            Risque
          </div>
          <div className="space-y-2">
            {riskWindows.length > 0 ? (
              riskWindows.map((window) => (
                <WindowRow
                  key={window.timestamp}
                  label={formatTime(window.timestamp)}
                  detail={window.severity === "pic" ? "Pic probable" : "Surveillance"}
                  value={`${Math.round(window.point.co2gPerKwh)} g`}
                />
              ))
            ) : (
              <div className="text-sm text-stone-400">Pas de pic fort detecte sur la timeline.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-8 gap-1 sm:grid-cols-12">
        {forecast.slice(0, 24).map((point) => (
          <div key={point.timestamp} className="group min-w-0">
            <div className="flex h-20 items-end rounded-md bg-white/[0.06] p-1" title={describePoint(point)}>
              <div
                className={`w-full rounded-sm ${barColor(point.stress)}`}
                style={{ height: `${Math.max(14, (point.consumptionMW / maxConsumption) * 100)}%` }}
              />
            </div>
            <div className="mt-1 truncate text-center text-[0.65rem] text-stone-500">{formatTime(point.timestamp)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {forecast.slice(0, 3).map((point) => (
          <div key={point.timestamp} className="rounded-md bg-black/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Zap size={13} />
              {formatTime(point.timestamp)}
            </div>
            <div className="mt-1 text-sm font-semibold text-white">{formatMw(point.consumptionMW)}</div>
            <div className="mt-0.5 text-xs text-stone-400">
              {formatPercent(point.renewableShare)} renouv. · {Math.round(point.co2gPerKwh)} gCO2
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WindowRow({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-stone-400">{detail}</div>
      </div>
      <div className="text-sm font-semibold text-stone-200">{value}</div>
    </div>
  );
}

function barColor(stress: EnergyForecastPoint["stress"]) {
  if (stress === "critical") {
    return "bg-pulse-coral";
  }

  if (stress === "strained") {
    return "bg-pulse-amber";
  }

  if (stress === "green") {
    return "bg-pulse-green";
  }

  return "bg-pulse-cyan";
}

function describePoint(point: EnergyForecastPoint) {
  return `${formatTime(point.timestamp)} · ${formatMw(point.consumptionMW)} · ${formatPercent(
    point.renewableShare,
  )} renouvelable · ${Math.round(point.co2gPerKwh)} gCO2/kWh`;
}
