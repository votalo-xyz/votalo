"use client";

import { useSyncExternalStore } from "react";
import type { Address, Hex } from "viem";
import type { Group, Proposal } from "./types";

/**
 * Local stand-in for the indexer until Phase 4 (GraphQL) lands: what this browser created, joined and
 * voted on. It keeps no key material, only public ids and member addresses.
 */
export type StoreState = {
  v: 1;
  groups: Group[];
  proposals: Proposal[];
  /** Member address per group joined from this browser. */
  members: Record<Hex, { address: Address; joinedAt: number }>;
  /** Choice per proposal voted from this browser. */
  votes: Record<Hex, number>;
};

const KEY = "votalo.ui.v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; state: StoreState | null } = { raw: null, state: null };

function fresh(): StoreState {
  return { v: 1, groups: [], proposals: [], members: {}, votes: {} };
}

function read(): StoreState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: fall through to the in-memory copy below.
  }
  if (cache.state && cache.raw === raw) return cache.state;
  let state: StoreState | null = null;
  try {
    const parsed = raw ? (JSON.parse(raw) as StoreState) : null;
    if (parsed && parsed.v === 1) state = parsed;
  } catch {
    state = null;
  }
  // Blocked storage keeps the last in-memory state so the session still works.
  state ??= raw === null && cache.state ? cache.state : fresh();
  cache = { raw, state };
  return state;
}

function write(next: StoreState) {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // Blocked: keep it in memory only.
  }
  cache = { raw, state: next };
  listeners.forEach((l) => l());
}

export function updateStore(change: (state: StoreState) => StoreState) {
  write(change(read()));
}

export function getStoreSnapshot(): StoreState {
  return read();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** `undefined` until the browser has been read (first render), so screens can show skeletons. */
export function useStore(): StoreState | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
