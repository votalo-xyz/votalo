"use client";

import { useEffect, useState } from "react";

/**
 * Whether Votalo can be installed here, and what to show. Chromium (Android, desktop) offers an install
 * prompt through `beforeinstallprompt`; iPhone Safari has no prompt, so the card explains the Share menu.
 * The listener is attached when this module loads (see PwaRoot), so a prompt that arrives before any
 * screen has mounted is not lost.
 */

const DISMISS_KEY = "votalo.install.dismissedUntil";
const INSTALLED_KEY = "votalo.install.installed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the prompt until a person asks for it, instead of letting the browser show its own bar.
    event.preventDefault();
    deferred = event as InstallPrompt;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    try {
      localStorage.setItem(INSTALLED_KEY, "1");
    } catch {}
    emit();
  });
}

export type InstallState = {
  /** False until the browser has been read; screens show nothing before that. */
  ready: boolean;
  installed: boolean;
  /** Chromium: a prompt is waiting. */
  canPrompt: boolean;
  /** iPhone or iPad Safari: the Share menu is the way in. */
  ios: boolean;
  /** "Ahora no" was pressed less than 14 days ago. */
  dismissed: boolean;
};

const EMPTY: InstallState = { ready: false, installed: false, canPrompt: false, ios: false, dismissed: false };

function read(): InstallState {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let installedFlag = false;
  let dismissedUntil = 0;
  try {
    installedFlag = localStorage.getItem(INSTALLED_KEY) === "1";
    dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  } catch {}
  return {
    ready: true,
    installed: standalone || installedFlag,
    canPrompt: deferred !== null,
    ios: /iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone,
    dismissed: Date.now() < dismissedUntil,
  };
}

export function useInstallState(): InstallState {
  const [state, setState] = useState<InstallState>(EMPTY);
  useEffect(() => {
    const update = () => setState(read());
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return state;
}

/** Shows the browser's install prompt. Resolves true when the person accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}

/** "Ahora no": hide the card for 14 days. */
export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch {}
  emit();
}
