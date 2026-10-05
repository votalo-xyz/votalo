"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "../ui/cn";
import { segVar } from "./living-ring";

export const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** Letter chip in the option's colour. The letter is the non-colour cue that tells options apart. */
export function OptionChip({ index, className }: { index: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold",
        className,
      )}
      style={{ background: segVar(index), color: `var(--seg-on-${(index % 6) + 1})` }}
    >
      {LETTERS[index]}
    </span>
  );
}

type Props = {
  options: string[];
  counts: number[];
  /** Index of the member's own vote. */
  mine?: number | null;
  className?: string;
};

/**
 * Per-option results. This is the live region: screen readers hear updates politely.
 * Each row repeats the label, count and percent in text, so colour is never the only signal.
 */
export function ResultsList({ options, counts, mine = null, className }: Props) {
  const t = useTranslations("Common");
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <ul aria-live="polite" aria-atomic="false" className={cn("flex flex-col gap-3", className)}>
      {options.map((label, i) => {
        const n = counts[i] ?? 0;
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <li key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <OptionChip index={i} />
              <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
              {mine === i && (
                <Check aria-hidden="true" className="size-4 shrink-0 text-success-text" strokeWidth={3} />
              )}
              <span className="shrink-0 tabular-nums text-sm text-muted">
                <span className="sr-only">{t("votes", { count: n })}, </span>
                <span aria-hidden="true">{n}</span> · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: segVar(i) }}
                initial={false}
                animate={{ scaleX: total > 0 ? n / total : 0 }}
                transition={{ type: "spring", stiffness: 90, damping: 18 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
