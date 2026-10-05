"use client";

import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { VotePanel } from "../vote/vote-panel";

// Votes that "other people" cast while the card is on screen. Fixed order, so every visit looks the same.
const SIMULATED = [0, 1, 0, 2, 0, 1, 0, 0, 2, 1, 0, 1];
const TICK_MS = 2400;

/** The hero demo. Nothing here is saved or sent: it is the real vote experience on example data. */
export function DemoPoll() {
  const t = useTranslations("Demo");
  const reduceMotion = useReducedMotion();
  const [counts, setCounts] = useState([5, 3, 2]);
  const [mine, setMine] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const step = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Simulated arrivals: only while visible, never with reduced motion, and they end once the visitor votes.
  useEffect(() => {
    if (!visible || reduceMotion || mine !== null) return;
    const id = window.setInterval(() => {
      if (step.current >= SIMULATED.length) {
        window.clearInterval(id);
        return;
      }
      const index = SIMULATED[step.current++];
      setCounts((c) => c.map((n, i) => (i === index ? n + 1 : n)));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [visible, reduceMotion, mine]);

  const cast = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));
  }, []);

  const confirmed = useCallback((choice: number) => {
    setMine(choice);
    setCounts((c) => c.map((n, i) => (i === choice ? n + 1 : n)));
  }, []);

  return (
    <div ref={ref} className="surface-card rounded-4xl p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-identity-soft px-3 py-1.5 text-xs font-semibold text-identity">
          <span aria-hidden="true" className="size-2 rounded-full bg-current" />
          {t("badge")}
        </span>
      </div>
      <h2 className="mt-4 text-h3">{t("question")}</h2>
      <VotePanel
        className="mt-6"
        compact
        options={[t("options.a"), t("options.b"), t("options.c")]}
        counts={counts}
        myChoice={mine}
        status="open"
        onCast={cast}
        onConfirmed={confirmed}
      />
      <p className="mt-6 border-t border-line pt-4 text-sm text-muted">{t("note")}</p>
    </div>
  );
}
