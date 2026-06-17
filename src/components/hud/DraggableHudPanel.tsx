import { ChevronDown, ChevronUp, Grip, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface DraggableHudPanelProps {
  storageId: string;
  title: string;
  defaultPosition: (viewport: ViewportSize) => Point;
  defaultCollapsed?: (viewport: ViewportSize) => boolean;
  className?: string;
  children: React.ReactNode;
}

interface Point {
  x: number;
  y: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const PANEL_MARGIN = 12;

export function DraggableHudPanel({ storageId, title, defaultPosition, defaultCollapsed, className, children }: DraggableHudPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>(() => getViewportSize());
  const [position, setPosition] = useState<Point>(() => loadPosition(storageKey(storageId, getViewportSize())) ?? defaultPosition(getViewportSize()));
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(collapsedStorageKey(storageId, getViewportSize())) ?? defaultCollapsed?.(getViewportSize()) ?? false);
  const key = useMemo(() => storageKey(storageId, viewport), [storageId, viewport]);
  const collapsedKey = useMemo(() => collapsedStorageKey(storageId, viewport), [storageId, viewport]);

  useEffect(() => {
    const onResize = () => {
      const nextViewport = getViewportSize();
      setViewport(nextViewport);
      setPosition((current) => clampPosition(current, panelRef.current, nextViewport));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const saved = loadPosition(key);
    setPosition(clampPosition(saved ?? defaultPosition(viewport), panelRef.current, viewport));
  }, [defaultPosition, key, viewport]);

  useEffect(() => {
    setCollapsed(loadCollapsed(collapsedKey) ?? defaultCollapsed?.(viewport) ?? false);
  }, [collapsedKey, defaultCollapsed, viewport]);

  const persist = useCallback(
    (nextPosition: Point) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(nextPosition));
      } catch {
        // Dragging should still work even when storage is unavailable.
      }
    },
    [key],
  );

  const reset = useCallback(() => {
    const nextPosition = clampPosition(defaultPosition(viewport), panelRef.current, viewport);
    setPosition(nextPosition);
    persist(nextPosition);
  }, [defaultPosition, persist, viewport]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(collapsedKey, JSON.stringify(next));
      } catch {
        // Collapse state is a convenience; do not block interaction if storage fails.
      }

      return next;
    });
  }, [collapsedKey]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const panel = panelRef.current;

      if (!panel) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - position.x,
        offsetY: event.clientY - position.y,
      };
    },
    [position],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const nextPosition = clampPosition(
        {
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY,
        },
        panelRef.current,
        viewport,
      );
      setPosition(nextPosition);
    },
    [viewport],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      dragRef.current = null;
      persist(position);
    },
    [persist, position],
  );

  return (
    <section
      ref={panelRef}
      className={`hud-panel pointer-events-auto fixed z-20 ${collapsed ? "is-collapsed" : ""} ${className ?? ""}`}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
    >
      <div className="-mx-1 -mt-1 mb-2 flex items-center justify-between gap-2">
        <button
          className="hud-drag-handle"
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label={`Deplacer ${title}`}
          title={`Deplacer ${title}`}
        >
          <Grip size={15} />
          <span className="min-w-0 truncate">{title}</span>
        </button>
        <button className="hud-reset-button" type="button" onClick={toggleCollapsed} aria-label={`${collapsed ? "Ouvrir" : "Minimiser"} ${title}`} title={collapsed ? "Ouvrir" : "Minimiser"}>
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
        <button className="hud-reset-button" type="button" onClick={reset} aria-label={`Reinitialiser ${title}`} title="Reinitialiser la position">
          <RotateCcw size={14} />
        </button>
      </div>
      {collapsed ? null : children}
    </section>
  );
}

function storageKey(storageId: string, viewport: ViewportSize) {
  return `pulse:hud-position:${viewport.width < 760 ? "mobile" : "desktop"}:${storageId}`;
}

function collapsedStorageKey(storageId: string, viewport: ViewportSize) {
  return `pulse:hud-collapsed:${viewport.width < 760 ? "mobile" : "desktop"}:${storageId}`;
}

function getViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 1440, height: 900 };
  }

  return { width: window.innerWidth, height: window.innerHeight };
}

function loadPosition(key: string): Point | undefined {
  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as Point;

    if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function loadCollapsed(key: string): boolean | undefined {
  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return undefined;
    }

    return JSON.parse(raw) === true;
  } catch {
    return undefined;
  }
}

function clampPosition(position: Point, panel: HTMLDivElement | null, viewport: ViewportSize): Point {
  const rect = panel?.getBoundingClientRect();
  const panelWidth = rect?.width ?? 360;
  const panelHeight = rect?.height ?? 180;

  return {
    x: Math.min(Math.max(position.x, PANEL_MARGIN), Math.max(PANEL_MARGIN, viewport.width - panelWidth - PANEL_MARGIN)),
    y: Math.min(Math.max(position.y, PANEL_MARGIN), Math.max(PANEL_MARGIN, viewport.height - panelHeight - PANEL_MARGIN)),
  };
}
