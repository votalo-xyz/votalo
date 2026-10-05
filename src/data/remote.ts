"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** What a screen sees while data loads, fails, is not available, or is ready. */
export type Remote<T> =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; data: T };

const refetchers = new Set<() => void>();

/** The data proxy caches for 5 to 10 seconds, so asking more often than this only repeats an old answer. */
export const MIN_POLL_MS = 5000;

const visible = () => document.visibilityState === "visible";

/**
 * Asks every mounted query to reload now and twice more after the proxy's cache window. Call it after an
 * action that changes on-chain data: the indexer needs a few seconds to catch up. Hidden tabs skip it.
 */
export function invalidateRemote() {
  const run = () => {
    if (visible()) refetchers.forEach((r) => r());
  };
  run();
  window.setTimeout(run, MIN_POLL_MS + 500);
  window.setTimeout(run, 2 * MIN_POLL_MS + 1000);
}

type Slot<T> = { key: string; data?: T; failed?: boolean };

/**
 * Small fetch-and-poll hook. `key === null` means nothing to fetch (status `unavailable`). Data for an
 * old key is never shown under a new one. Polling pauses while the tab is hidden and never runs faster
 * than `MIN_POLL_MS`.
 */
export function useRemote<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  refreshMs = 0,
): Remote<T> {
  const interval = refreshMs > 0 ? Math.max(refreshMs, MIN_POLL_MS) : 0;
  const [slot, setSlot] = useState<Slot<T>>({ key: "" });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(fetcher);
  useEffect(() => {
    latest.current = fetcher;
  });

  const load = useCallback(
    (signal: AbortSignal) => {
      if (key === null) return;
      latest
        .current(signal)
        .then((data) => setSlot({ key, data }))
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === "AbortError") return;
          // Keep showing what we had if a refresh fails; only a first load becomes an error.
          setSlot((prev) => (prev.key === key && prev.data !== undefined ? prev : { key, failed: true }));
        });
    },
    [key],
  );

  useEffect(() => {
    if (key === null) return;
    let controller = new AbortController();
    const reload = () => {
      controller.abort();
      controller = new AbortController();
      load(controller.signal);
    };
    reload();
    refetchers.add(reload);
    const timer = interval
      ? window.setInterval(() => {
          if (visible()) reload();
        }, interval)
      : undefined;
    return () => {
      controller.abort();
      refetchers.delete(reload);
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [key, load, interval, attempt]);

  if (key === null) return { status: "unavailable" };
  if (slot.key !== key) return { status: "loading" };
  if (slot.failed) return { status: "error", retry: () => setAttempt((n) => n + 1) };
  return { status: "ready", data: slot.data as T };
}
