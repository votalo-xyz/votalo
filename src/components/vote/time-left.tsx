"use client";

import { Clock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useNowSeconds } from "@/data/hooks";
import { Skeleton } from "../ui/skeleton";

/** Time remaining as a short phrase, or the closing date once voting is over. */
export function useTimeLeftText(deadline: number): string | null {
  const t = useTranslations("Time");
  const p = useTranslations("Proposal");
  const format = useFormatter();
  const now = useNowSeconds();
  if (now === 0) return null;

  const left = deadline - now;
  if (left <= 0) return p("closedOn", { date: format.dateTime(new Date(deadline * 1000), { day: "numeric", month: "long" }) });

  const d = Math.floor(left / 86_400);
  const h = Math.floor((left % 86_400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  let time: string;
  if (d >= 1) time = t("dh", { d, h });
  else if (h >= 1) time = t("hm", { h, m });
  else if (m >= 1) time = t("m", { m });
  else time = t("lt1");
  return p("timeLeft", { time });
}

export function TimeLeft({ deadline }: { deadline: number }) {
  const text = useTimeLeftText(deadline);
  if (!text) return <Skeleton className="h-6 w-36 rounded-full" />;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <Clock aria-hidden="true" className="size-4" />
      {text}
    </span>
  );
}
