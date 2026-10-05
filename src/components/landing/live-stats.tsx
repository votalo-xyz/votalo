"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "../ui/skeleton";
import { useLiveStats, type LiveStats } from "../use-live-stats";

const KEYS = ["groups", "members", "proposals", "votes"] as const satisfies readonly (keyof LiveStats)[];

/** Four live totals. A dash stands in until real data arrives, never an invented number. */
export function LiveStatsGrid() {
  const t = useTranslations("Proof.stats");
  const c = useTranslations("Common");
  const state = useLiveStats();

  return (
    <dl aria-live="polite" className="mt-6 grid grid-cols-2 gap-3">
      {KEYS.map((key) => (
        <div key={key} className="rounded-2xl bg-surface-2 px-4 py-3">
          <dt className="text-sm text-muted">{t(key)}</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums leading-none">
            {state.status === "loading" ? (
              <>
                <Skeleton className="mt-1 h-8 w-14" />
                <span className="sr-only">{c("loading")}</span>
              </>
            ) : state.status === "ready" ? (
              state.stats[key]
            ) : (
              c("dash")
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
