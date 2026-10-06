"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../ui/cn";

const pad = (n: number) => String(n).padStart(2, "0");
const slideId = (n: number) => `slide-${n}`;

/**
 * Keyboard, progress bar, dots and counter for the deck. The scrolling and snapping are native CSS;
 * this only decides which slide is current and moves to the next or previous one.
 */
export function DeckControls({ total }: { total: number }) {
  const t = useTranslations("Pitch");
  const [current, setCurrent] = useState(1);
  const currentRef = useRef(1);

  const go = useCallback(
    (n: number) => {
      const target = Math.min(total, Math.max(1, n));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(slideId(target))?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    },
    [total],
  );

  // The current slide is the one crossing the middle of the viewport. Works for tall slides on phones too.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const n = Number((entry.target as HTMLElement).dataset.slide);
          currentRef.current = n;
          setCurrent(n);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    document.querySelectorAll<HTMLElement>("[data-slide]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      // Space on a focused link or button must still activate it.
      if (event.key === " " && el?.closest("a, button, [role='button']")) return;

      let direction = 0;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") direction = 1;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") direction = -1;
      else if (event.key === " ") direction = event.shiftKey ? -1 : 1;
      else return;

      // A slide taller than the screen (small laptops, phones) scrolls natively until its edge is reached.
      const rect = document.getElementById(slideId(currentRef.current))?.getBoundingClientRect();
      if (rect && direction === 1 && rect.bottom > window.innerHeight + 8) return;
      if (rect && direction === -1 && rect.top < -8) return;

      event.preventDefault();
      go(currentRef.current + direction);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="deck-chrome">
      <div
        role="progressbar"
        aria-label={t("progress")}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={t("slideOf", { n: current, total })}
        className="fixed inset-x-0 top-0 z-[60] h-1 bg-track"
      >
        <div
          className="h-full origin-left bg-accent transition-transform duration-500 ease-[var(--ease-spring)]"
          style={{ transform: `scaleX(${current / total})` }}
        />
      </div>

      <nav aria-label={t("progress")} className="fixed right-4 top-1/2 z-[55] hidden -translate-y-1/2 flex-col lg:flex">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => go(n)}
            aria-label={t("goTo", { n })}
            aria-current={n === current ? "step" : undefined}
            className="group flex size-6 items-center justify-center"
          >
            <span
              className={cn(
                "block rounded-full transition-all duration-300",
                n === current ? "size-3 bg-accent" : "size-2 bg-line-strong group-hover:bg-muted",
              )}
            />
          </button>
        ))}
      </nav>

      <div className="fixed bottom-4 right-4 z-[55] flex items-center gap-3 rounded-full border border-line-strong bg-surface px-4 py-2 font-mono text-sm shadow-card lg:right-14">
        <span className="hidden text-muted xl:inline">{t("keys")}</span>
        <span className="font-semibold tabular-nums">
          {pad(current)} / {pad(total)}
        </span>
      </div>
    </div>
  );
}
