import type { PasskeyCredential } from "./passkey";

// Holds only credentialId and transports. No key material is stored.
const STORAGE_KEY = "votalo.passkey.v1";

export function saveCredential(credential: PasskeyCredential): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
  } catch {
    // Storage blocked (private window or cleared site data). The user can sign in again later.
  }
}

export function loadCredential(): PasskeyCredential | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PasskeyCredential;
    return typeof parsed.credentialId === "string" ? parsed : null;
  } catch {
    return null;
  }
}
