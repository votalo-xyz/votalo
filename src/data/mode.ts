"use client";

import { useSyncExternalStore } from "react";

/**
 * `live`: the server has an indexer behind /api/data/*, so screens read it and actions are the real
 * sign-and-relay flows. `local`: no indexer configured, so screens run on example data kept in this browser.
 * The server says which (GET /api/data-mode); the browser never sees the indexer's address.
 */
export type DataMode = "live" | "local";

let resolved: DataMode | undefined;
let failed = false;
let inflight: Promise<DataMode> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** Asks the server once and remembers the answer. A failed check is not remembered. */
export function resolveDataMode(): Promise<DataMode> {
  if (resolved) return Promise.resolve(resolved);
  inflight ??= fetch("/api/data-mode")
    .then((res) => (res.ok ? (res.json() as Promise<{ live?: boolean }>) : Promise.reject(new Error("mode"))))
    .then((body) => {
      resolved = body.live === true ? "live" : "local";
      failed = false;
      return resolved;
    })
    .catch((error) => {
      failed = true;
      throw error;
    })
    .finally(() => {
      inflight = null;
      notify();
    });
  return inflight;
}

export function retryDataMode() {
  failed = false;
  notify();
  resolveDataMode().catch(() => {});
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!resolved && !inflight && !failed) resolveDataMode().catch(() => {});
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * `undefined` while checking, `"error"` if the check failed. A failure is never treated as `local`:
 * that would let a flaky connection record votes in this browser instead of sending them.
 */
export function useDataMode(): DataMode | "error" | undefined {
  return useSyncExternalStore(
    subscribe,
    () => resolved ?? (failed ? "error" : undefined),
    () => undefined,
  );
}
