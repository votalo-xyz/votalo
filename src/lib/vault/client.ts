/**
 * Browser-side vault flows: saveVault and restoreVault. Each PRF output is derived into a key or id
 * and zeroed immediately after use; it is never stored, logged, or sent anywhere.
 *
 * Prompts: the vault id is cached locally after the first time it is derived (localCache.ts), so a
 * save on a device that has saved before needs one passkey prompt (the vault key). The very first
 * save on a device, and a restore on a device that has never saved (a new device), need two: one for
 * the vault id, one for the vault key.
 */
import { getPasskeyPrfOutput, type WebAuthnClient } from "@category-labs/mera";
import type { PasskeyCredential } from "../identity/passkey";
import { VAULT_ID_PRF_SALT, VAULT_KEY_PRF_SALT } from "./salts";
import { decryptVault, deriveVaultId, deriveVaultKey, encryptVault, type EncryptedVault } from "./crypto";
import { getCachedVaultId, setCachedVaultId } from "./localCache";
import type { VaultContent, VaultGroupEntry } from "./types";

export class VaultClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

type Common = { rpId: string; credential: PasskeyCredential; webAuthnClient?: WebAuthnClient };

async function getOrDeriveVaultId(c: Common): Promise<string> {
  const cached = getCachedVaultId();
  if (cached) return cached;
  const { prfOutput } = await getPasskeyPrfOutput({
    rpId: c.rpId,
    credential: c.credential,
    prfSalt: VAULT_ID_PRF_SALT,
    webAuthnClient: c.webAuthnClient,
  });
  try {
    const vaultId = await deriveVaultId(prfOutput);
    setCachedVaultId(vaultId);
    return vaultId;
  } finally {
    prfOutput.fill(0);
  }
}

async function getVaultKey(c: Common): Promise<CryptoKey> {
  const { prfOutput } = await getPasskeyPrfOutput({
    rpId: c.rpId,
    credential: c.credential,
    prfSalt: VAULT_KEY_PRF_SALT,
    webAuthnClient: c.webAuthnClient,
  });
  try {
    return await deriveVaultKey(prfOutput);
  } finally {
    prfOutput.fill(0);
  }
}

async function putVault(vaultId: string, encrypted: EncryptedVault): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/vault/${vaultId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(encrypted),
    });
  } catch {
    throw new VaultClientError("NETWORK", 0);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new VaultClientError(data.error || "INTERNAL", res.status);
  }
}

async function getVault(vaultId: string): Promise<EncryptedVault | null> {
  let res: Response;
  try {
    res = await fetch(`/api/vault/${vaultId}`, { method: "GET" });
  } catch {
    throw new VaultClientError("NETWORK", 0);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new VaultClientError(data.error || "INTERNAL", res.status);
  }
  return (await res.json()) as EncryptedVault;
}

/** Saves the full group list for this passkey. Call after every create or join. */
export async function saveVault(c: Common & { groups: VaultGroupEntry[] }): Promise<void> {
  const vaultId = await getOrDeriveVaultId(c);
  const key = await getVaultKey(c);
  const content: VaultContent = { v: 1, groups: c.groups };
  const encrypted = await encryptVault(key, content);
  await putVault(vaultId, encrypted);
}

/** Restores the group list after passkey sign-in on a new device. Returns `null` when this passkey
 * has never saved a vault. */
export async function restoreVault(c: Common): Promise<VaultGroupEntry[] | null> {
  const vaultId = await getOrDeriveVaultId(c);
  const encrypted = await getVault(vaultId);
  if (!encrypted) return null;
  const key = await getVaultKey(c);
  const content = await decryptVault<VaultContent>(key, encrypted);
  return content.groups;
}
