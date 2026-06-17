import { ArrowLeft, ArrowRight, CheckCircle2, Gauge, Leaf, Radio, Shield, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PulseGuide } from "../character/PulseGuide";

interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialOverlay({ open, onClose }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(
    () => [
      {
        icon: <Gauge size={22} />,
        title: "Nara t'ouvre la porte",
        body: "Je m'appelle Nara. Quand le reseau national force, mes triangles se fissurent. Regarde les jauges : elles disent si la ville respire ou si elle serre les dents.",
      },
      {
        icon: <Shield size={22} />,
        title: "Les gestes deviennent magie",
        body: "Ici, une quete n'est pas un clic vide. Si tu coupes les veilles ou decales un usage lourd, la citadelle gagne des watts civiques et son bouclier reprend couleur.",
      },
      {
        icon: <Zap size={22} />,
        title: "Reconstruis quartier par quartier",
        body: "Les toits solaires, les jardins frais et les batteries ne sont pas des decorations. Ce sont les cicatrices que la ville transforme en force.",
      },
      {
        icon: <Radio size={22} />,
        title: "Ecoute l'Oracle",
        body: "Quand tu passes en Oracle, les donnees perdent leur costume de tableau. Elles deviennent flux, couleur et son. C'est la meme realite, mais avec les nerfs a vif.",
      },
    ],
    [],
  );
  const activeStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowRight") {
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      }

      if (event.key === "ArrowLeft") {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, steps.length]);

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/[0.54] p-4 backdrop-blur-sm">
      <section
        className="w-[min(92vw,560px)] rounded-lg border border-white/[0.12] bg-[#0c1412]/95 p-4 shadow-hud sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pulse-tutorial-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-pulse-cyan/15 text-pulse-cyan">
              {activeStep.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-pulse-green">
                <Leaf size={14} />
                Tutoriel
              </div>
              <h2 id="pulse-tutorial-title" className="mt-1 text-xl font-semibold text-white">
                {activeStep.title}
              </h2>
            </div>
          </div>
          <button className="hud-icon-button shrink-0" type="button" onClick={onClose} aria-label="Fermer le tutoriel">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-end">
          <PulseGuide mood={stepIndex === 1 ? "urgent" : stepIndex === 2 ? "hope" : "calm"} className="mx-auto h-36 w-32 sm:h-44 sm:w-40" />
          <p className="rounded-md border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-stone-200">{activeStep.body}</p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2" aria-label="Progression du tutoriel">
          {steps.map((step, index) => (
            <button
              key={step.title}
              className={`h-1.5 rounded-full transition ${index <= stepIndex ? "bg-pulse-cyan" : "bg-white/[0.14]"}`}
              type="button"
              onClick={() => setStepIndex(index)}
              aria-label={`Etape ${index + 1}`}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button className="tutorial-secondary-button" type="button" onClick={onClose}>
            Passer
          </button>
          <div className="flex gap-2">
            <button
              className="tutorial-secondary-button"
              type="button"
              disabled={isFirstStep}
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            >
              <ArrowLeft size={17} />
              Retour
            </button>
            {isLastStep ? (
              <button className="hud-action-button flex-1 sm:flex-none" type="button" onClick={onClose}>
                <CheckCircle2 size={18} />
                Commencer
              </button>
            ) : (
              <button
                className="hud-action-button flex-1 sm:flex-none"
                type="button"
                onClick={() => setStepIndex((current) => Math.min(current + 1, steps.length - 1))}
              >
                Suivant
                <ArrowRight size={17} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
