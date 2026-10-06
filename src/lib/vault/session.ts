/**
 * The vault key and id for this page session, kept in memory only, never in storage. Once derived, saves
 * need no passkey prompt. The session ends after IDLE_MS without use, on sign-out (clearVaultSession), and
 * when the page is hidden or closed (pagehide). A reload also clears it, since nothing is persisted.
 */
import { deriveVaultId, deriveVaultKey } from "./crypto";

const IDLE_MS = 15 * 60_000;

export type VaultSession = { vaultId: string; vaultKey: CryptoKey };

type Entry = VaultSession & { expiresAt: number };

let current: Entry | null = null;

/** The live session, or null. Each successful read extends the idle timeout. */
export function getVaultSession(now: number = Date.now()): VaultSession | null {
  if (!current) return null;
  if (current.expiresAt <= now) {
    clearVaultSession();
    return null;
  }
  current.expiresAt = now + IDLE_MS;
  return { vaultId: current.vaultId, vaultKey: current.vaultKey };
}

export function setVaultSession(session: VaultSession, now: number = Date.now()): void {
  current = { ...session, expiresAt: now + IDLE_MS };
}

/** Forgets the vault key and id. Call on sign-out. */
export function clearVaultSession(): void {
  current = null;
}

/**
 * Derives the vault id and key from one PRF output and makes them the session. The caller still owns the
 * PRF output and must zero it afterwards; this only reads it.
 */
export async function primeVaultSession(prfOutput: Uint8Array<ArrayBuffer>, now: number = Date.now()): Promise<VaultSession> {
  const vaultId = await deriveVaultId(prfOutput);
  const vaultKey = await deriveVaultKey(prfOutput);
  const session = { vaultId, vaultKey };
  setVaultSession(session, now);
  return session;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", clearVaultSession);
}
