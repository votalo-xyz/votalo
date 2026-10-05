"use client";

import { useSyncExternalStore } from "react";
import { loadCredential, saveCredential } from "@/lib/identity/credentialStore";
import type { PasskeyCredential } from "@/lib/identity/passkey";

const listeners = new Set<() => void>();
let cached: PasskeyCredential | null | undefined;

function read(): PasskeyCredential | null {
  const next = loadCredential();
  // Keep the same object while nothing changed, so React does not re-render in a loop.
  if (cached !== undefined && cached?.credentialId === next?.credentialId) return cached;
  cached = next;
  return next;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Saves the passkey and tells every screen that uses it. */
export function storeCredential(credential: PasskeyCredential) {
  saveCredential(credential);
  cached = undefined;
  listeners.forEach((l) => l());
}

/** The member's passkey on this device. `undefined` until the browser has been read, `null` when there is none. */
export function useCredential(): PasskeyCredential | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
