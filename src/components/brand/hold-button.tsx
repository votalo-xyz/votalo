"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Fingerprint } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../ui/cn";

export type HoldState = "idle" | "working" | "done";

type Props = {
  state: HoldState;
  disabled?: boolean;
  /** Time the person has to keep pressing. About 0.9 s. */
  durationMs?: number;
  /** CSS colour for the progress ring, usually the chosen option's colour. */
  color?: string;
  /** Accessible name, e.g. "Hold to vote for Pizza". */
  label: string;
  size?: number;
  className?: string;
  ref?: React.Ref<HTMLButtonElement>;
  onComplete: () => void;
  /** Released before the ring filled. Lets the parent say "keep holding". */
  onShortPress?: () => void;
};

function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not available (desktop, iOS Safari, blocked). The ring is the main feedback anyway.
  }
}

/**
 * Hold to vote. A ring fills around the button while it is pressed; when it closes the action fires.
 * Keyboard and screen-reader activation (a click without a pointer) fires at once, since holding a
 * key down is not a reliable gesture for everyone.
 */
export function HoldButton({
  state,
  disabled = false,
  durationMs = 900,
  color = "var(--accent)",
  label,
  size = 132,
  className,
  ref,
  onComplete,
  onShortPress,
}: Props) {
  const progress = useMotionValue(0);
  // A round cap on an empty arc still paints a dot, so hide the ring until it starts to fill.
  const ringOpacity = useTransform(progress, [0, 0.015], [0, 1]);
  const raf = useRef(0);
  const startedAt = useRef(0);
  const holding = useRef(false);
  const completed = useRef(false);
  const [pressing, setPressing] = useState(false);
  const interactive = state === "idle" && !disabled;

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    holding.current = false;
    setPressing(false);
  }, []);

  const finish = useCallback(() => {
    completed.current = true;
    stop();
    progress.set(1);
    haptic([14, 40, 28]);
    onComplete();
  }, [onComplete, progress, stop]);

  const start = () => {
    if (!interactive || holding.current) return;
    holding.current = true;
    completed.current = false;
    setPressing(true);
    haptic(8);
    startedAt.current = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - startedAt.current) / durationMs);
      progress.set(p);
      if (p >= 1) finish();
      else raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const release = () => {
    if (!holding.current) return;
    stop();
    if (!completed.current) {
      animate(progress, 0, { duration: 0.3, ease: "easeOut" });
      onShortPress?.();
    }
  };

  // Back to an empty ring once the parent resets to idle (after an error, for example).
  useEffect(() => {
    if (state === "idle" && !holding.current) animate(progress, 0, { duration: 0.3, ease: "easeOut" });
    if (state === "done") progress.set(1);
  }, [state, progress]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" aria-hidden="true" className={cn("absolute inset-0 size-full -rotate-90 overflow-visible", state === "working" && "animate-pulse")}>
        <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-track" />
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke={state === "done" ? "var(--success)" : color}
          style={{ pathLength: progress, opacity: ringOpacity }}
        />
      </svg>
      <motion.button
        ref={ref}
        type="button"
        disabled={disabled || state === "working"}
        aria-label={label}
        aria-busy={state === "working"}
        animate={{ scale: pressing ? 0.92 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerMove={(e) => {
          if (!holding.current) return;
          const r = e.currentTarget.getBoundingClientRect();
          const slop = 24;
          if (e.clientX < r.left - slop || e.clientX > r.right + slop || e.clientY < r.top - slop || e.clientY > r.bottom + slop) {
            release();
          }
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          // detail === 0: keyboard or assistive technology. Real taps and clicks go through the pointer path.
          if (e.detail !== 0 || !interactive) return;
          completed.current = true;
          progress.set(1);
          haptic([14, 40, 28]);
          onComplete();
        }}
        className={cn(
          "absolute inset-[11px] flex touch-none select-none items-center justify-center rounded-full outline-offset-4 [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]",
          state === "done" ? "bg-success text-accent-fg" : "bg-accent text-accent-fg shadow-card",
          !interactive && state === "idle" && "bg-surface-2 text-muted shadow-none",
        )}
      >
        {state === "done" ? (
          <Check aria-hidden="true" className="size-1/3" strokeWidth={3} />
        ) : (
          <Fingerprint aria-hidden="true" className="size-[38%]" strokeWidth={1.6} />
        )}
      </motion.button>
    </div>
  );
}
