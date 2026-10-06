/**
 * Caches the vault id in this browser, so a save after the first one needs only one passkey prompt
 * (for the vault key), not two. The vault id is an opaque lookup name, not a secret: by itself it
 * reveals nothing without the vault key, which is never cached.
 */
const KEY = "votalo.vault.id.v1";

export function getCachedVaultId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCachedVaultId(vaultId: string): void {
  try {
    localStorage.setItem(KEY, vaultId);
  } catch {
    // Storage blocked (private window or cleared site data). The next save re-derives it with
    // one extra passkey prompt.
  }
}
