"use client";

import { motion } from "motion/react";
import { Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { HoldButton, type HoldState } from "../brand/hold-button";
import { LivingRing, segVar, type RingPulse } from "../brand/living-ring";
import { OptionChip } from "../brand/results-list";
import { classifyError, type ErrorKey } from "../errors";
import { cn } from "../ui/cn";

type Flight = { id: number; index: number; from: { x: number; y: number }; to: { x: number; y: number } };

export type VotePanelProps = {
  options: string[];
  counts: number[];
  /** The member's own vote, if any. */
  myChoice: number | null;
  /** `open` lets the member vote. The others explain why not. */
  status: "open" | "closed" | "notMember";
  /** Signs and sends the vote. Throw to report a failure. */
  onCast: (choice: number) => Promise<void>;
  /** Called when the particle lands in the ring: update the counts here. */
  onConfirmed: (choice: number) => void;
  /** Called with every failure. When it handles PRF_UNAVAILABLE itself, the inline message is skipped. */
  onError?: (key: ErrorKey) => void;
  /** Smaller ring beside the options, for narrow cards such as the landing demo. */
  compact?: boolean;
  className?: string;
};

/**
 * The vote experience: living ring, option cards that double as live results, and hold to vote.
 * On a confirmed vote a particle flies from the button into the ring and the ring grows.
 */
export function VotePanel({ options, counts, myChoice, status, onCast, onConfirmed, onError, compact = false, className }: VotePanelProps) {
  const t = useTranslations("Vote");
  const e = useTranslations("Errors");
  const name = useId();

  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<HoldState>("idle");
  const [shortPress, setShortPress] = useState(false);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [pulse, setPulse] = useState<RingPulse | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const counter = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const alreadyVoted = myChoice !== null;
  const locked = alreadyVoted || status !== "open";
  const choice = alreadyVoted ? myChoice : selected;
  const total = counts.reduce((a, b) => a + b, 0);

  // Plain-text summary for the ring label and the polite live region.
  let lead = t("noVotes");
  if (total > 0) {
    const max = Math.max(...counts);
    const leaders = counts.flatMap((n, i) => (n === max ? [i] : []));
    lead =
      leaders.length > 1
        ? t("tie")
        : t("leading", { option: options[leaders[0]], percent: Math.round((max / total) * 100) });
  }
  const summary = total > 0 ? t("summary", { total, lead }) : lead;

  async function handleComplete() {
    if (selected === null) return;
    const picked = selected;
    setErrorKey(null);
    setShortPress(false);
    setPhase("working");
    try {
      await onCast(picked);
    } catch (err) {
      const key = classifyError(err);
      setErrorKey(key);
      setPhase("idle");
      onError?.(key);
      return;
    }
    setPhase("done");
    launchParticle(picked);
  }

  function land(picked: number) {
    setFlight(null);
    counter.current += 1;
    setPulse({ index: picked, id: counter.current });
    onConfirmed(picked);
  }

  function launchParticle(picked: number) {
    const from = buttonRef.current?.getBoundingClientRect();
    const to = ringRef.current?.getBoundingClientRect();
    if (!from || !to) {
      land(picked);
      return;
    }
    counter.current += 1;
    setFlight({
      id: counter.current,
      index: picked,
      from: { x: from.left + from.width / 2, y: from.top + from.height / 2 },
      to: { x: to.left + to.width / 2, y: to.top + to.height / 2 },
    });
  }

  const chosenLabel = choice !== null ? options[choice] : "";
  const showButton = !locked || phase === "done";
  const inlineError = errorKey && !(errorKey === "PRF_UNAVAILABLE" && onError) ? e(errorKey) : null;

  let statusText: string;
  if (phase === "done") statusText = t("done", { option: chosenLabel });
  else if (phase === "working") statusText = t("working");
  else if (alreadyVoted) statusText = t("alreadyVoted", { option: chosenLabel });
  else if (status === "closed") statusText = t("closed");
  else if (status === "notMember") statusText = t("notMember");
  else if (shortPress) statusText = t("keepHolding");
  else if (selected === null) statusText = t("pickOne");
  else statusText = t("holdHint", { option: chosenLabel });

  return (
    <div className={cn("@container", className)}>
      <div
        className={cn(
          "grid items-center gap-6",
          compact
            ? "@sm:grid-cols-[9rem_minmax(0,1fr)] @sm:gap-6"
            : "gap-8 @2xl:grid-cols-[minmax(0,17rem)_1fr] @2xl:gap-10",
        )}
      >
        <div ref={ringRef} className={cn("mx-auto w-full", compact ? "max-w-[11rem] @sm:max-w-none" : "max-w-[15rem] @2xl:max-w-none")}>
          <LivingRing counts={counts} highlight={choice} pulse={pulse} label={t("ringLabel", { summary })}>
            <span className="font-display text-5xl font-extrabold leading-none tabular-nums sm:text-6xl">{total}</span>
            <span className="mt-1.5 text-sm text-muted">{t("votesWord", { count: total })}</span>
          </LivingRing>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <fieldset disabled={locked || phase !== "idle"} className="min-w-0">
            <legend className="sr-only">{t("optionsLegend")}</legend>
            <div className="flex flex-col gap-2.5">
              {options.map((label, i) => {
                const n = counts[i] ?? 0;
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                const checked = choice === i;
                return (
                  <label
                    key={i}
                    className={cn(
                      "relative block overflow-hidden rounded-2xl border px-4 py-3 transition-[border-color,background-color,transform] duration-200",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                      checked ? "border-fg bg-surface-2" : "border-line bg-surface",
                      !locked && phase === "idle" ? "cursor-pointer hover:border-line-strong active:scale-[0.99]" : "cursor-default",
                    )}
                  >
                    <input
                      type="radio"
                      name={name}
                      value={i}
                      checked={checked}
                      onChange={() => {
                        setSelected(i);
                        setShortPress(false);
                        setErrorKey(null);
                      }}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-3">
                      <OptionChip index={i} />
                      <span className="min-w-0 flex-1 break-words font-medium leading-snug">{label}</span>
                      {alreadyVoted && myChoice === i && (
                        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-text">
                          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                          <span className="sr-only">{t("yourVote")}</span>
                        </span>
                      )}
                      <span className="shrink-0 text-sm tabular-nums text-muted">
                        <span className="sr-only">{t("optionResult", { votes: n, percent: pct })}</span>
                        <span aria-hidden="true">
                          {n} · {pct}%
                        </span>
                      </span>
                    </span>
                    <span aria-hidden="true" className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-track">
                      <motion.span
                        className="block h-full origin-left rounded-full"
                        style={{ background: segVar(i) }}
                        initial={false}
                        animate={{ scaleX: total > 0 ? n / total : 0 }}
                        transition={{ type: "spring", stiffness: 90, damping: 18 }}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center gap-4">
            {showButton ? (
              <HoldButton
                ref={buttonRef}
                size={108}
                state={phase}
                disabled={selected === null}
                color={selected !== null ? segVar(selected) : undefined}
                label={t("holdLabel", { option: chosenLabel })}
                onComplete={handleComplete}
                onShortPress={() => setShortPress(true)}
              />
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex size-[68px] shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-muted"
              >
                {alreadyVoted ? <Check className="size-6 text-success-text" strokeWidth={3} /> : <Lock className="size-6" />}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p role="status" className="text-[0.95rem] leading-snug text-fg">
                {statusText}
              </p>
              {inlineError && (
                <p role="alert" className="mt-1.5 text-sm font-medium leading-snug text-danger">
                  {inlineError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {summary}
      </p>

      {flight && (
        <motion.span
          key={flight.id}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[80] size-4 rounded-full"
          style={{ background: segVar(flight.index), boxShadow: `0 0 20px 6px ${segVar(flight.index)}` }}
          initial={{ x: flight.from.x - 8, y: flight.from.y - 8, scale: 0.7, opacity: 1 }}
          animate={{
            x: [flight.from.x - 8, (flight.from.x + flight.to.x) / 2 - 8, flight.to.x - 8],
            y: [flight.from.y - 8, Math.min(flight.from.y, flight.to.y) - 90, flight.to.y - 8],
            scale: [0.7, 1.5, 0.6],
            opacity: [1, 1, 0.85],
          }}
          transition={{ duration: 0.8, ease: "easeInOut", times: [0, 0.45, 1] }}
          onAnimationComplete={() => land(flight.index)}
        />
      )}
    </div>
  );
}
