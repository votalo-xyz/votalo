"use client";

import { useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import type { Address, Hex } from "viem";
import { buildDemo, type DemoTexts } from "./demo";
import { useStore } from "./store";
import type { Group, Proposal } from "./types";

const tickListeners = new Set<() => void>();
let tickTimer: number | undefined;
let nowCache = 0;

function subscribeTick(onChange: () => void) {
  tickListeners.add(onChange);
  if (tickTimer === undefined) {
    tickTimer = window.setInterval(() => {
      nowCache = Math.floor(Date.now() / 1000);
      tickListeners.forEach((l) => l());
    }, 15_000);
  }
  return () => {
    tickListeners.delete(onChange);
    if (tickListeners.size === 0 && tickTimer !== undefined) {
      window.clearInterval(tickTimer);
      tickTimer = undefined;
    }
  };
}

/** Unix seconds, refreshed every 15 s. `0` on the server and on the first render, so callers show a placeholder. */
export function useNowSeconds(): number {
  return useSyncExternalStore(
    subscribeTick,
    () => (nowCache === 0 ? (nowCache = Math.floor(Date.now() / 1000)) : nowCache),
    () => 0,
  );
}

export type Catalog = {
  groups: Group[];
  proposals: Proposal[];
  /** Member address per group joined from this browser. */
  memberOf: (groupId: Hex) => Address | null;
  /** The member's choice on a proposal, from this browser. */
  myChoice: (proposalId: Hex) => number | null;
};

/**
 * Everything the screens list: the example group plus what this browser created, with this member's
 * own votes already counted. `undefined` until the browser has been read.
 */
export function useCatalog(): Catalog | undefined {
  const store = useStore();
  const t = useTranslations("DemoData");
  const now = useNowSeconds();
  const day = Math.floor(now / 86_400);

  const demo = useMemo(() => {
    if (day === 0) return null;
    const texts: DemoTexts = {
      group: t("group"),
      open: { title: t("open.title"), options: t.raw("open.options") as string[] },
      closed: { title: t("closed.title"), options: t.raw("closed.options") as string[] },
    };
    return buildDemo(texts, day * 86_400);
  }, [t, day]);

  return useMemo(() => {
    if (!store || !demo) return undefined;
    const groups = [...store.groups, demo.group].map((g) => ({
      ...g,
      members: g.members + (g.demo && store.members[g.id] ? 1 : 0),
    }));
    const proposals = [...store.proposals, ...demo.proposals].map((p) => {
      const choice = store.votes[p.id];
      return choice === undefined ? p : { ...p, counts: p.counts.map((n, i) => (i === choice ? n + 1 : n)) };
    });
    return {
      groups,
      proposals,
      memberOf: (groupId: Hex) => store.members[groupId]?.address ?? null,
      myChoice: (proposalId: Hex) => store.votes[proposalId] ?? null,
    };
  }, [store, demo]);
}
