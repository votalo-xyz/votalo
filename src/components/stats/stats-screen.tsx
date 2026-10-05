"use client";

import { useTranslations } from "next-intl";
import { useNowSeconds, useVotesPerDay } from "@/data/hooks";
import { Skeleton } from "../ui/skeleton";
import { useLiveStats, type LiveStats } from "../use-live-stats";
import { VotesChart } from "./votes-chart";

const KEYS = ["groups", "members", "proposals", "votes"] as const satisfies readonly (keyof LiveStats)[];

export function StatsScreen() {
  const t = useTranslations("Stats");
  const proof = useTranslations("Proof.stats");
  const c = useTranslations("Common");
  const totals = useLiveStats();
  const perDay = useVotesPerDay();
  const now = useNowSeconds();
  const todayMs = Math.floor(now / 86_400) * 86_400_000;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <header className="max-w-2xl">
        <h1 className="text-h2">{t("title")}</h1>
        <p className="text-lead mt-4 text-muted">{t("lead")}</p>
      </header>

      <section aria-labelledby="totals-title" className="mt-12">
        <h2 id="totals-title" className="text-h3">
          {t("totalsTitle")}
        </h2>
        <dl aria-live="polite" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KEYS.map((key) => (
            <div key={key} className="surface-card rounded-3xl px-5 py-4">
              <dt className="text-sm text-muted">{proof(key)}</dt>
              <dd className="mt-2 font-display text-4xl font-extrabold tabular-nums leading-none">
                {totals.status === "loading" ? (
                  <>
                    <Skeleton className="h-9 w-16" />
                    <span className="sr-only">{c("loading")}</span>
                  </>
                ) : totals.status === "ready" ? (
                  totals.stats[key]
                ) : (
                  c("dash")
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-muted">{t("source")}</p>
      </section>

      <section aria-labelledby="perday-title" className="mt-14">
        <h2 id="perday-title" className="text-h3">
          {t("perDayTitle")}
        </h2>
        <div className="surface-card mt-5 rounded-4xl p-5 sm:p-8">
          {perDay.status === "unavailable" ? (
            <p className="text-muted">{t("perDayUnavailable")}</p>
          ) : perDay.status === "error" ? (
            <p role="alert" className="text-muted">
              {t("perDayError")}
            </p>
          ) : perDay.status === "loading" || now === 0 ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : perDay.data.length === 0 ? (
            <p className="text-muted">{t("perDayEmpty")}</p>
          ) : (
            <VotesChart rows={perDay.data} todayMs={todayMs} />
          )}
        </div>
      </section>
    </div>
  );
}
