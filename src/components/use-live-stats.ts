"use client";

import { useEffect, useState } from "react";

export type LiveStats = {
  groups: string;
  members: string;
  proposals: string;
  votes: string;
};

export type LiveStatsState = { status: "loading" } | { status: "error" } | { status: "ready"; stats: LiveStats };

/** Reads the public totals once. Anything but a clean answer becomes "error", and the UI shows a dash. */
export function useLiveStats(): LiveStatsState {
  const [state, setState] = useState<LiveStatsState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats", { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<LiveStats>) : Promise.reject(new Error("stats"))))
      .then((stats) => setState({ status: "ready", stats }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  return state;
}
