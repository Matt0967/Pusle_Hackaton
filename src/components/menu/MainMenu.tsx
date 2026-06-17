import { BookOpen, Play, Radio, Shield, Sparkles } from "lucide-react";
import type { EnergySnapshot } from "../../domain/energy";
import type { DerivedEnergyState } from "../../domain/energy";
import { formatMw, formatPercent } from "../../utils/format";
import { PulseGuide } from "../character/PulseGuide";

interface MainMenuProps {
  snapshot?: EnergySnapshot;
  derived?: DerivedEnergyState;
  onStart: () => void;
}

export function MainMenu({ snapshot, derived, onStart }: MainMenuProps) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 overflow-y-auto bg-[#080d0b]/82 p-4 text-stone-50 backdrop-blur-md sm:p-6">
      <div className="mx-auto grid min-h-full max-w-6xl items-center gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-pulse-cyan/25 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            <Sparkles size={15} />
            Ecosysteme energetique vivant
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-none text-white sm:text-6xl">
            Pulse
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-300">
            La derniere citadelle sensible dort sous le reseau francais. Chaque pic de consommation devient une tempete.
            Chaque watt sauve en vrai rallume une fenetre dans la ville.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <LoreCard icon={<Shield size={18} />} title="Ta mission" text="Garder la ville vivante pendant les heures tendues." />
            <LoreCard icon={<Radio size={18} />} title="L'Oracle" text="Ecouter les donnees quand elles deviennent flux, musique et signes." />
            <LoreCard icon={<BookOpen size={18} />} title="Le pacte" text="Les gestes reels donnent les ressources du monde virtuel." />
          </div>

          <button className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-pulse-green px-5 py-3 font-bold text-pulse-ink transition hover:brightness-105" type="button" onClick={onStart}>
            <Play size={20} />
            Entrer dans la citadelle
          </button>
        </section>

        <aside className="rounded-lg border border-white/10 bg-black/28 p-4 shadow-hud">
          <div className="flex items-end justify-center">
            <PulseGuide mood={derived?.gridStress === "critical" ? "urgent" : "hope"} className="h-64 w-56 drop-shadow-[0_0_26px_rgba(93,224,215,0.2)]" />
          </div>
          <div className="mt-4 rounded-md border border-pulse-cyan/20 bg-pulse-cyan/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">Nara</div>
            <p className="mt-2 text-sm leading-6 text-stone-200">
              Je suis nee des fragments de vos compteurs. Si le reseau tremble, je l'entends avant les murs.
              Viens. On va apprendre a faire tenir une ville avec des gestes minuscules.
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <MenuMetric label="Conso" value={snapshot ? formatMw(snapshot.rte.consumptionMW) : "..."} />
            <MenuMetric label="Renouv." value={derived ? formatPercent(derived.renewableShare) : "..."} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function LoreCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <span className="text-pulse-cyan">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-400">{text}</p>
    </div>
  );
}

function MenuMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.07] px-3 py-2">
      <div className="text-xs text-stone-400">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}
