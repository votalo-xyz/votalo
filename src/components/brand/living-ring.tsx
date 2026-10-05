"use client";

import { motion } from "motion/react";
import { cn } from "../ui/cn";

const R = 80;
const C = 2 * Math.PI * R;
const STROKE = 17;
const MARK_OFFSET = 17;
const MARK_SCALE = (R + MARK_OFFSET) / R;
const GAP = STROKE + 5; // round caps extend by half the stroke on each side

/** Colour variable for option `index`. Alternating light and dark steps, set in globals.css. */
export const segVar = (index: number) => `var(--seg-${(index % 6) + 1})`;

export type RingPulse = { index: number; id: number };

type Props = {
  counts: number[];
  /** Marks one segment with an outer arc (the member's own vote). */
  highlight?: number | null;
  /** Adds a halo to one segment, used when a vote lands. Change `id` to replay it. */
  pulse?: RingPulse | null;
  className?: string;
  label: string;
  children?: React.ReactNode;
};

/**
 * The living ring: results as a donut whose segments grow as votes arrive.
 * Segments animate with a spring on stroke-dasharray (SVG paint only, no layout).
 */
export function LivingRing({ counts, highlight = null, pulse = null, className, label, children }: Props) {
  const total = counts.reduce((a, b) => a + b, 0);
  const visible = counts.filter((n) => n > 0).length;
  const gap = visible > 1 ? GAP : 0;

  const segments = counts.map((n, i) => {
    const before = counts.slice(0, i).reduce((a, b) => a + b, 0);
    const fraction = total > 0 ? n / total : 0;
    // A segment shorter than its own gap is drawn as a dot (a zero-length dash with a round cap).
    const len = n > 0 ? Math.max(0.01, fraction * C - gap) : 0;
    return { i, n, len, start: (total > 0 ? before / total : 0) * C + gap / 2 };
  });

  return (
    <div className={cn("relative aspect-square w-full", className)}>
      <svg viewBox="0 0 200 200" role="img" aria-label={label} className="size-full -rotate-90 overflow-visible">
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth={STROKE} className="stroke-track" />
        {segments.map((s) => (
          <motion.circle
            key={s.i}
            cx="100"
            cy="100"
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            style={{ stroke: segVar(s.i) }}
            initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -s.start }}
            animate={{
              strokeDasharray: `${s.len} ${C - s.len}`,
              strokeDashoffset: -s.start,
            }}
            transition={{ type: "spring", stiffness: 70, damping: 16, mass: 0.9 }}
          />
        ))}
        {/* The member's own vote: a thin arc outside the ring, same colour as the segment. */}
        {highlight !== null && segments[highlight] && segments[highlight].len > 0 && (
          <motion.circle
            cx="100"
            cy="100"
            r={R + MARK_OFFSET}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ stroke: segVar(highlight) }}
            initial={false}
            animate={{
              strokeDasharray: `${segments[highlight].len * MARK_SCALE} ${C * MARK_SCALE - segments[highlight].len * MARK_SCALE}`,
              strokeDashoffset: -segments[highlight].start * MARK_SCALE,
            }}
            transition={{ type: "spring", stiffness: 70, damping: 16 }}
          />
        )}
        {pulse && segments[pulse.index] && segments[pulse.index].len > 0 && (
          <motion.circle
            key={pulse.id}
            cx="100"
            cy="100"
            r={R}
            fill="none"
            strokeLinecap="round"
            style={{ stroke: segVar(pulse.index) }}
            strokeDasharray={`${segments[pulse.index].len} ${C - segments[pulse.index].len}`}
            strokeDashoffset={-segments[pulse.index].start}
            initial={{ opacity: 0.7, strokeWidth: STROKE }}
            animate={{ opacity: 0, strokeWidth: STROKE + 22 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
