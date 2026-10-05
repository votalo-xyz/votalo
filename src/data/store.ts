"use client";

import { useSyncExternalStore } from "react";
import type { Address, Hex } from "viem";
import type { Group, Proposal } from "./types";

/**
 * What this browser created, joined and voted on. With the indexer endpoint set it is a cache that fills
 * the gap until the indexer catches up; without it, it is the data source. No key material, only public
 * ids and member addresses.
 */
export type StoreState = {
  v: 2;
  /** Groups created in this browser. */
  groups: Group[];
  proposals: Proposal[];
  /** Member address per group joined from this browser. */
  members: Record<Hex, { address: Address; joinedAt: number }>;
  /**
   * Votes cast from this browser. `baseline` is the proposal total at that moment: the vote counts on
   * top of the shown total until the total passes it, so a vote is never counted twice.
   */
  votes: Record<Hex, { choice: number; baseline: number }>;
};

const KEY = "votalo.ui.v2";
const listeners = new Set<() => void>();
let cache: { raw: string | null; state: StoreState | null } = { raw: null, state: null };

function fresh(): StoreState {
  return { v: 2, groups: [], proposals: [], members: {}, votes: {} };
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
    if (parsed && parsed.v === 2) state = parsed;
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
