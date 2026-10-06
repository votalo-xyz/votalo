/**
 * Browser-side vault flows: saveVault, restoreVault and restoreVaultFromPasskey.
 *
 * All of them use one PRF evaluation (VAULT_PRF_SALT) for the vault key and the vault id, and keep the
 * result in memory for the page session (session.ts). Passkey prompts:
 *   - saveVault: 1 on the first save of a page session, 0 after that.
 *   - restoreVault: 1 on the first use of a page session, 0 after that.
 *   - restoreVaultFromPasskey (a device with no passkey saved): 1, and it also returns the credential.
 * The PRF output is zeroed right after deriving the key and id; it is never stored or sent anywhere.
 */
import { getPasskeyPrfOutput, type WebAuthnClient } from "@category-labs/mera";
import type { PasskeyCredential } from "../identity/passkey";
import { decryptVault, encryptVault, type EncryptedVault } from "./crypto";
import { getVaultSession, primeVaultSession, type VaultSession } from "./session";
import { VAULT_PRF_SALT } from "./salts";
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

/** Returns the page session, asking the passkey once if there is none yet. */
async function ensureSession(c: Common): Promise<VaultSession> {
  const live = getVaultSession();
  if (live) return live;
  const { prfOutput } = await getPasskeyPrfOutput({
    rpId: c.rpId,
    credential: c.credential,
    prfSalt: VAULT_PRF_SALT,
    webAuthnClient: c.webAuthnClient,
  });
  try {
    return await primeVaultSession(prfOutput);
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
  const session = await ensureSession(c);
  const content: VaultContent = { v: 1, groups: c.groups };
  const encrypted = await encryptVault(session.vaultKey, content);
  await putVault(session.vaultId, encrypted);
}

/** Restores the group list for a passkey that is already known on this device. Returns `null` when that
 * passkey has never saved a vault. */
export async function restoreVault(c: Common): Promise<VaultGroupEntry[] | null> {
  const session = await ensureSession(c);
  const encrypted = await getVault(session.vaultId);
  if (!encrypted) return null;
  const content = await decryptVault<VaultContent>(session.vaultKey, encrypted);
  return content.groups;
}

/**
 * For a device with no passkey saved yet: the platform picks the passkey (one prompt), which gives the
 * credential and the vault key in the same step. Returns the credential so the caller can keep it, and the
 * group list, or `null` when this passkey has never saved a vault.
 */
export async function restoreVaultFromPasskey(args: {
  rpId: string;
  webAuthnClient?: WebAuthnClient;
}): Promise<{ credential: PasskeyCredential; groups: VaultGroupEntry[] | null }> {
  const { credentialId, prfOutput } = await getPasskeyPrfOutput({
    rpId: args.rpId,
    prfSalt: VAULT_PRF_SALT,
    webAuthnClient: args.webAuthnClient,
  });
  const credential: PasskeyCredential = { credentialId };
  let session: VaultSession;
  try {
    session = await primeVaultSession(prfOutput);
  } finally {
    prfOutput.fill(0);
  }
  const encrypted = await getVault(session.vaultId);
  if (!encrypted) return { credential, groups: null };
  const content = await decryptVault<VaultContent>(session.vaultKey, encrypted);
  return { credential, groups: content.groups };
}
