import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Leaf,
  Radio,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PulseGuide } from "../character/PulseGuide";

interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
  completedQuests: number;
  shieldCharge: number;
  upgradeLevelTotal: number;
  hasAffordableUpgrade: boolean;
}

interface TutorialStep {
  target: string;
  placement: "left" | "right" | "top" | "bottom";
  icon: ReactNode;
  title: string;
  body: string;
  mood: "calm" | "urgent" | "hope";
  requires?: "quest" | "upgrade";
  actionLabel?: string;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

const GAP = 18;
const BUBBLE_WIDTH = 360;
const BUBBLE_FALLBACK_HEIGHT = 244;

export function TutorialOverlay({
  open,
  onClose,
  completedQuests,
  shieldCharge,
  upgradeLevelTotal,
  hasAffordableUpgrade,
}: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | undefined>();
  const [bubbleHeight, setBubbleHeight] = useState(BUBBLE_FALLBACK_HEIGHT);
  const [viewport, setViewport] = useState<Viewport>(() => getViewport());
  const bubbleRef = useRef<HTMLElement>(null);
  const initialQuestCountRef = useRef(0);
  const initialUpgradeLevelRef = useRef(0);
  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        target: "game-state",
        placement: "right",
        icon: <Gauge size={20} />,
        title: "Nara t'ouvre la porte",
        body: "Ce panneau te dit dans quel etat vit la citadelle. Si le reseau national se tend, la ville perd de la vitalite et le ciel devient plus hostile.",
        mood: "calm",
      },
      {
        target: "quest-validate",
        placement: "top",
        icon: <Shield size={20} />,
        title: "Proteger, c'est agir",
        body: "Le bouton de protection, c'est Valider. Fais le geste indique dans la vraie vie, puis clique Valider : tu recharges le bouclier et tu gagnes des watts civiques.",
        mood: "urgent",
        requires: "quest",
        actionLabel: "Clique Valider dans le panneau de quete",
      },
      {
        target: "grid-stats",
        placement: "left",
        icon: <Sparkles size={20} />,
        title: "Le bouclier absorbe les pics",
        body: `Regarde la jauge Bouclier : elle monte quand tu valides une quete. C'est la protection directe. Niveau actuel : ${Math.round(
          shieldCharge,
        )} %.`,
        mood: "hope",
      },
      {
        target: "upgrade-first",
        placement: "top",
        icon: <Zap size={20} />,
        title: "Rendre la protection durable",
        body: hasAffordableUpgrade
          ? "Les watts civiques servent ensuite a acheter une amelioration. Clique une ligne disponible : elle reduira les futurs malus de la citadelle."
          : "Les ameliorations transforment les watts civiques en resilience permanente. Quand une ligne devient disponible, achete-la pour encaisser les prochains pics.",
        mood: "hope",
        requires: hasAffordableUpgrade ? "upgrade" : undefined,
        actionLabel: "Clique une amelioration disponible",
      },
      {
        target: "toolbar",
        placement: "bottom",
        icon: <Radio size={20} />,
        title: "Oracle et previsions",
        body: "La barre du haut sert a changer de mode, activer la voix Oracle et ouvrir la timeline 24 h. Utilise-la pour trouver les meilleures fenetres d'action.",
        mood: "calm",
      },
    ],
    [hasAffordableUpgrade, shieldCharge],
  );
  const activeStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const questDone = completedQuests > initialQuestCountRef.current;
  const upgradeDone = upgradeLevelTotal > initialUpgradeLevelRef.current;
  const requiredDone =
    activeStep.requires === "quest" ? questDone : activeStep.requires === "upgrade" ? upgradeDone : true;
  const bubblePosition = computeBubblePosition(targetRect, viewport, activeStep.placement, bubbleHeight);
  const targetCenter = targetRect ? centerOf(targetRect) : undefined;
  const bubbleCenter = {
    x: bubblePosition.left + bubblePosition.width / 2,
    y: bubblePosition.top + Math.min(bubbleHeight, BUBBLE_FALLBACK_HEIGHT) / 2,
  };

  const refreshTarget = useCallback(() => {
    const nextViewport = getViewport();
    const target = document.querySelector(`[data-tour="${activeStep.target}"]`) as HTMLElement | null;

    setViewport(nextViewport);

    if (!target) {
      setTargetRect(undefined);
      return;
    }

    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    const rect = target.getBoundingClientRect();
    setTargetRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });

    window.requestAnimationFrame(() => {
      const bubbleRect = bubbleRef.current?.getBoundingClientRect();

      if (bubbleRect?.height) {
        setBubbleHeight(bubbleRect.height);
      }
    });
  }, [activeStep.target]);

  const goNext = useCallback(() => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStepIndex(0);
    initialQuestCountRef.current = completedQuests;
    initialUpgradeLevelRef.current = upgradeLevelTotal;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    refreshTarget();
    const onResize = () => refreshTarget();
    const onScroll = () => refreshTarget();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, refreshTarget, stepIndex]);

  useEffect(() => {
    if (!open || !activeStep.requires || !requiredDone) {
      return;
    }

    const timer = window.setTimeout(goNext, 520);
    return () => window.clearTimeout(timer);
  }, [activeStep.requires, goNext, open, requiredDone]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowRight" && requiredDone) {
        goNext();
      }

      if (event.key === "ArrowLeft") {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, onClose, open, requiredDone]);

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {targetRect ? (
        <>
          <div
            className="fixed rounded-lg border-2 border-pulse-cyan shadow-[0_0_0_9999px_rgba(0,0,0,0.26),0_0_34px_rgba(93,224,215,0.44)]"
            style={{
              left: targetRect.left - 6,
              top: targetRect.top - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            aria-hidden="true"
          />
          <svg className="fixed inset-0 h-screen w-screen" aria-hidden="true">
            <line
              x1={bubbleCenter.x}
              y1={bubbleCenter.y}
              x2={targetCenter?.x}
              y2={targetCenter?.y}
              stroke="rgba(93,224,215,0.92)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <circle cx={targetCenter?.x} cy={targetCenter?.y} r="5" fill="rgb(93,224,215)" />
          </svg>
        </>
      ) : null}

      <section
        ref={bubbleRef}
        className="pointer-events-auto fixed rounded-lg border border-white/[0.14] bg-[#0c1412]/95 p-4 shadow-hud backdrop-blur-md"
        style={{
          left: bubblePosition.left,
          top: bubblePosition.top,
          width: bubblePosition.width,
        }}
        role="dialog"
        aria-labelledby="pulse-tutorial-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-pulse-cyan/15 text-pulse-cyan">
              {activeStep.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-pulse-green">
                <Leaf size={13} />
                Nara
              </div>
              <h2 id="pulse-tutorial-title" className="mt-1 truncate text-lg font-semibold text-white">
                {activeStep.title}
              </h2>
            </div>
          </div>
          <button className="hud-icon-button shrink-0" type="button" onClick={onClose} aria-label="Fermer le tutoriel">
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-[70px_minmax(0,1fr)] gap-3">
          <PulseGuide mood={activeStep.mood} className="h-24 w-20 self-end" />
          <div>
            <p className="text-sm leading-5 text-stone-200">{activeStep.body}</p>
            {activeStep.requires ? (
              <div className="mt-3 rounded-md border border-pulse-cyan/25 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-pulse-cyan">
                {requiredDone ? "Action captee" : activeStep.actionLabel}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Progression du tutoriel">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`h-1.5 rounded-full ${index <= stepIndex ? "bg-pulse-cyan" : "bg-white/[0.14]"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
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
            </button>
            {isLastStep ? (
              <button className="hud-action-button" type="button" onClick={onClose}>
                <CheckCircle2 size={18} />
                Jouer
              </button>
            ) : (
              <button className="hud-action-button" type="button" disabled={!requiredDone} onClick={goNext}>
                {activeStep.requires && !requiredDone ? "A toi" : "Suivant"}
                <ArrowRight size={17} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function getViewport(): Viewport {
  if (typeof window === "undefined") {
    return { width: 1440, height: 900 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function centerOf(rect: Rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function computeBubblePosition(
  targetRect: Rect | undefined,
  viewport: Viewport,
  preferredPlacement: TutorialStep["placement"],
  measuredHeight: number,
) {
  const width = Math.min(BUBBLE_WIDTH, viewport.width - 28);
  const height = measuredHeight || BUBBLE_FALLBACK_HEIGHT;
  const fallback = {
    left: clamp(16, 14, viewport.width - width - 14),
    top: clamp(96, 14, viewport.height - height - 14),
    width,
  };

  if (!targetRect) {
    return fallback;
  }

  const placement = viewport.width < 760 ? mobilePlacement(targetRect, viewport) : preferredPlacement;
  const targetCenter = centerOf(targetRect);

  if (placement === "right") {
    return {
      left: clamp(targetRect.left + targetRect.width + GAP, 14, viewport.width - width - 14),
      top: clamp(targetCenter.y - height / 2, 14, viewport.height - height - 14),
      width,
    };
  }

  if (placement === "left") {
    return {
      left: clamp(targetRect.left - width - GAP, 14, viewport.width - width - 14),
      top: clamp(targetCenter.y - height / 2, 14, viewport.height - height - 14),
      width,
    };
  }

  if (placement === "top") {
    return {
      left: clamp(targetCenter.x - width / 2, 14, viewport.width - width - 14),
      top: clamp(targetRect.top - height - GAP, 14, viewport.height - height - 14),
      width,
    };
  }

  return {
    left: clamp(targetCenter.x - width / 2, 14, viewport.width - width - 14),
    top: clamp(targetRect.top + targetRect.height + GAP, 14, viewport.height - height - 14),
    width,
  };
}

function mobilePlacement(targetRect: Rect, viewport: Viewport): TutorialStep["placement"] {
  return targetRect.top > viewport.height * 0.46 ? "top" : "bottom";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
