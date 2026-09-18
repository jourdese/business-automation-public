"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Grip,
  Sparkles,
  X,
} from "lucide-react";
import CompanionMark from "./CompanionMark";
import styles from "./JourvisPresence.module.css";

export type JourvisPresenceAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

type Position = {
  left: number;
  top: number;
};

type FocusGeometry = {
  x: number;
  y: number;
  distance: number;
  angle: number;
  visible: boolean;
};

const POSITION_KEY = "jourvis:presence-position:v1";
const FOCUS_CLASS = "jourvis-focus-target";

export default function JourvisPresence({
  eyebrow = "JOURVIS",
  message,
  detail,
  status = "Available",
  attention = false,
  actions = [],
  focusTarget,
  focusLabel = "Jourvis needs this",
}: {
  eyebrow?: string;
  message: string;
  detail?: string;
  status?: string;
  attention?: boolean;
  actions?: JourvisPresenceAction[];
  focusTarget?: string;
  focusLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const movedRef = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [focusGeometry, setFocusGeometry] = useState<FocusGeometry | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(POSITION_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Position;
      if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return;
      setPosition(clampPosition(parsed.left, parsed.top, 72, 72));
    } catch {
      // Keep the default dock when a saved position cannot be read.
    }
  }, []);

  useEffect(() => {
    if (open) {
      setNudge(false);
      return;
    }
    setNudge(true);
    const timer = window.setTimeout(() => setNudge(false), 5200);
    return () => window.clearTimeout(timer);
  }, [message, open]);

  useEffect(() => {
    function keepOnScreen() {
      setPosition((current) =>
        current ? clampPosition(current.left, current.top, 72, 72) : current,
      );
    }
    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, []);

  const updateFocusGeometry = useCallback(() => {
    const root = rootRef.current;
    const target = targetRef.current;
    if (!root || !target || !attention || !focusTarget) {
      setFocusGeometry(null);
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const sourceX = rootRect.left + rootRect.width / 2;
    const sourceY = rootRect.top + rootRect.height / 2;
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.hypot(dx, dy);
    const visible =
      targetRect.bottom > 8 &&
      targetRect.top < window.innerHeight - 8 &&
      targetRect.right > 8 &&
      targetRect.left < window.innerWidth - 8;

    setFocusGeometry({
      x: dx,
      y: dy,
      distance: Math.max(0, distance - 34),
      angle: Math.atan2(dy, dx) * (180 / Math.PI),
      visible,
    });
  }, [attention, focusTarget]);

  useEffect(() => {
    let currentTarget: HTMLElement | null = null;

    function applyTarget() {
      const nextTarget =
        attention && focusTarget
          ? document.querySelector<HTMLElement>(focusTarget)
          : null;

      if (currentTarget !== nextTarget) {
        if (currentTarget) {
          currentTarget.classList.remove(FOCUS_CLASS);
          currentTarget.removeAttribute("data-jourvis-focus-label");
        }
        currentTarget = nextTarget;
        targetRef.current = nextTarget;
        if (nextTarget) {
          nextTarget.classList.add(FOCUS_CLASS);
          nextTarget.setAttribute("data-jourvis-focus-label", focusLabel);
        }
      }

      updateFocusGeometry();
    }

    applyTarget();

    const observer = new MutationObserver(applyTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", applyTarget);
    window.addEventListener("scroll", applyTarget, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyTarget);
      window.removeEventListener("scroll", applyTarget, true);
      if (currentTarget) {
        currentTarget.classList.remove(FOCUS_CLASS);
        currentTarget.removeAttribute("data-jourvis-focus-label");
      }
      targetRef.current = null;
      setFocusGeometry(null);
    };
  }, [attention, focusTarget, focusLabel, updateFocusGeometry]);

  useEffect(() => {
    updateFocusGeometry();
  }, [position, open, dragging, updateFocusGeometry]);

  function remember(next: Position) {
    setPosition(next);
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    } catch {
      // Position persistence is a convenience only.
    }
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    movedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!movedRef.current && Math.hypot(dx, dy) < 5) return;
    movedRef.current = true;
    setDragging(true);
    setOpen(false);
    setNudge(false);
    remember(clampPosition(drag.startLeft + dx, drag.startTop + dy, 72, 72));
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    window.requestAnimationFrame(updateFocusGeometry);
  }

  function toggleOpen() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen((current) => !current);
  }

  function dock(side: "left" | "right") {
    const root = rootRef.current;
    const height = root?.getBoundingClientRect().height ?? 72;
    const next = clampPosition(
      side === "left" ? 18 : window.innerWidth - 90,
      Math.min(
        window.innerHeight - height - 24,
        position?.top ?? window.innerHeight - 116,
      ),
      72,
      height,
    );
    remember(next);
  }

  function revealTarget() {
    const target = targetRef.current;
    if (!target) return;
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
      inline: "nearest",
    });
    window.setTimeout(updateFocusGeometry, 320);
  }

  const side =
    position && position.left < windowSafeWidth() / 2 ? "left" : "right";
  const vertical =
    position && position.top < 360 ? "below" : "above";

  return (
    <div
      ref={rootRef}
      className={styles.presence}
      data-open={open}
      data-dragging={dragging}
      data-side={side}
      data-vertical={vertical}
      style={
        position
          ? { left: position.left, top: position.top, right: "auto", bottom: "auto" }
          : undefined
      }
    >
      {focusGeometry?.visible && attention ? (
        <>
          <span
            className={styles.focusBeam}
            style={{
              width: focusGeometry.distance,
              transform: `rotate(${focusGeometry.angle}deg)`,
            }}
            aria-hidden="true"
          />
          <span
            className={styles.focusBadge}
            style={{
              left: 36 + focusGeometry.x,
              top: 36 + focusGeometry.y,
            }}
            aria-hidden="true"
          >
            {focusLabel}
          </span>
        </>
      ) : null}

      {nudge && !open ? (
        <button type="button" className={styles.nudge} onClick={() => setOpen(true)}>
          <span>{attention ? "I need you for this one." : "I’m right here."}</span>
          <small>{shorten(message, 76)}</small>
        </button>
      ) : null}

      {open ? (
        <section className={styles.panel} aria-label="Jourvis assistant">
          <div className={styles.panelTop}>
            <div className={styles.identity}>
              <span className={styles.miniCompanion}>
                <CompanionMark />
              </span>
              <div>
                <span>{eyebrow}</span>
                <strong>{status}</strong>
              </div>
            </div>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setOpen(false)}
              aria-label="Close Jourvis"
            >
              <X size={15} aria-hidden />
            </button>
          </div>

          <div className={styles.message}>
            <Sparkles size={15} aria-hidden />
            <div>
              <strong>{message}</strong>
              {detail ? <p>{detail}</p> : null}
            </div>
          </div>

          {attention && focusTarget ? (
            <button type="button" className={styles.showTarget} onClick={revealTarget}>
              <Crosshair size={14} aria-hidden />
              <span>Show me where</span>
              <ChevronRight size={14} aria-hidden />
            </button>
          ) : null}

          {actions.length ? (
            <div className={styles.actions}>
              {actions.slice(0, 3).map((action) =>
                action.href ? (
                  <a key={action.label} href={action.href} data-primary={action.primary}>
                    {action.label}
                    <ChevronRight size={14} aria-hidden />
                  </a>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    data-primary={action.primary}
                    onClick={() => {
                      action.onClick?.();
                      setOpen(false);
                    }}
                  >
                    {action.label}
                    <ChevronRight size={14} aria-hidden />
                  </button>
                ),
              )}
            </div>
          ) : null}

          <div className={styles.dockControls}>
            <span>
              <Grip size={12} aria-hidden /> Drag me anywhere
            </span>
            <div>
              <button
                type="button"
                onClick={() => dock("left")}
                aria-label="Dock Jourvis on the left"
              >
                <ChevronLeft size={13} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => dock("right")}
                aria-label="Dock Jourvis on the right"
              >
                <ChevronRight size={13} aria-hidden />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className={styles.orb}
        data-attention={attention}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={toggleOpen}
        aria-label={open ? "Close Jourvis" : "Open Jourvis"}
        aria-expanded={open}
      >
        <span className={styles.orbHalo} />
        <span className={styles.orbFace}>
          <CompanionMark />
        </span>
        <span className={styles.presenceDot} />
        <span className={styles.dragHint}>
          <Grip size={11} aria-hidden />
        </span>
      </button>
    </div>
  );
}

function windowSafeWidth() {
  return typeof window === "undefined" ? 1280 : window.innerWidth;
}

function clampPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): Position {
  if (typeof window === "undefined") return { left, top };
  const pad = 12;
  return {
    left: Math.max(pad, Math.min(window.innerWidth - width - pad, left)),
    top: Math.max(pad, Math.min(window.innerHeight - height - pad, top)),
  };
}

function shorten(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}
