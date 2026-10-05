"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { DayVotes } from "@/data/types";

const W = 640;
const H = 260;
const M = { top: 14, right: 8, bottom: 30, left: 34 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const MIN_DAYS = 14;
const MAX_DAYS = 90;
const DAY_MS = 86_400_000;

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Fills the days that had no votes with zeros, so the bars show real gaps. Ends today (UTC). */
function continuous(rows: DayVotes[], todayMs: number): DayVotes[] {
  const byDay = new Map(rows.map((r) => [r.day, r.votes]));
  const first = rows.length ? Date.parse(`${rows[0].day}T00:00:00Z`) : todayMs;
  const end = Math.max(todayMs, rows.length ? Date.parse(`${rows[rows.length - 1].day}T00:00:00Z`) : todayMs);
  const start = Math.max(Math.min(first, end - (MIN_DAYS - 1) * DAY_MS), end - (MAX_DAYS - 1) * DAY_MS);
  const out: DayVotes[] = [];
  for (let ms = start; ms <= end; ms += DAY_MS) out.push({ day: dayKey(ms), votes: byDay.get(dayKey(ms)) ?? 0 });
  return out;
}

/** A bar with a rounded top and a flat base, so it sits on the baseline. */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/**
 * Votes per day. One series, so no legend: the heading names it. Hover or focus a day for its value;
 * the same numbers are in the table below for anyone who prefers it.
 */
export function VotesChart({ rows, todayMs }: { rows: DayVotes[]; todayMs: number }) {
  const t = useTranslations("Stats");
  const c = useTranslations("Common");
  const format = useFormatter();
  const [active, setActive] = useState<number | null>(null);

  const days = useMemo(() => continuous(rows, todayMs), [rows, todayMs]);
  const max = Math.max(1, ...days.map((d) => d.votes));
  const top = max <= 4 ? 4 : Math.ceil(max / 5) * 5;
  const band = PLOT_W / days.length;
  const barW = Math.min(26, Math.max(4, band * 0.62));
  const y = (v: number) => M.top + PLOT_H - (v / top) * PLOT_H;
  const label = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" });

  // Selective labels: first, last, and a few in between, never every day.
  const step = Math.ceil(days.length / 5);
  const labelled = new Set(days.flatMap((_, i) => (i === 0 || i === days.length - 1 || (i % step === 0 && days.length - 1 - i >= step * 0.6) ? [i] : [])));
  const grid = [0, top / 2, top].filter((v, i, a) => a.indexOf(v) === i);
  const current = active === null ? null : days[active];
  // Keep the tooltip inside the card: near the right edge it hangs to the left of the bar, near the left to the right.
  const place = active === null ? 0.5 : (active + 0.5) / days.length;
  const shift = place > 0.78 ? "-translate-x-[85%]" : place < 0.22 ? "-translate-x-[15%]" : "-translate-x-1/2";

  return (
    <figure>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chartLabel")} className="h-auto w-full overflow-visible">
          {grid.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--muted)">
                {Number.isInteger(v) ? v : ""}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = M.left + band * i + (band - barW) / 2;
            const h = d.votes === 0 ? 0 : Math.max(2, (d.votes / top) * PLOT_H);
            return (
              <g key={d.day}>
                {h > 0 && (
                  <path
                    d={barPath(x, M.top + PLOT_H - h, barW, h, 4)}
                    fill="var(--identity)"
                    opacity={active === null || active === i ? 1 : 0.45}
                  />
                )}
                {labelled.has(i) && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
                    {label(d.day)}
                  </text>
                )}
                {/* Hit area wider than the bar, and focusable, so hover and keyboard both work. */}
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={PLOT_H}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${label(d.day)}: ${c("votes", { count: d.votes })}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none focus-visible:stroke-[var(--focus)] focus-visible:[stroke-width:2px]"
                />
              </g>
            );
          })}
          <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" strokeWidth="1.5" />
        </svg>

        {current && active !== null && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -translate-y-full whitespace-nowrap rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm shadow-card ${shift}`}
            style={{
              left: `${((M.left + band * active + band / 2) / W) * 100}%`,
              top: `${(Math.min(y(current.votes), y(0) - 8) / H) * 100}%`,
            }}
          >
            <span className="block text-xs text-muted">{label(current.day)}</span>
            <span className="font-semibold tabular-nums">{c("votes", { count: current.votes })}</span>
          </div>
        )}
      </div>

      <figcaption className="mt-3 text-sm text-muted">{t("utcNote")}</figcaption>

      <details className="mt-4 rounded-2xl border border-line bg-surface">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium">{t("viewTable")}</summary>
        <div className="max-h-72 overflow-auto px-4 pb-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 font-medium">
                  {t("day")}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {t("votes")}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-2">{d.day}</td>
                  <td className="py-2 text-right tabular-nums">{d.votes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
