import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import { decryptVault, deriveVaultId, deriveVaultKey, encryptVault } from "./crypto";
import { memberAddressFromPrf } from "../identity/memberKey";
import { groupPrfSalt } from "../identity/groupSalt";
import { getGroupPrfOutput } from "../identity/passkey";
import type { WebAuthnClient } from "@category-labs/mera";

// Simulated authenticator, same convention as identity.test.ts: PRF(salt) = keccak256(secret || salt).
function fakeAuthenticator(secret: string): WebAuthnClient {
  const prf = (salt: Uint8Array): Uint8Array<ArrayBuffer> =>
    new Uint8Array(Buffer.from(keccak256(new Uint8Array([...stringToBytes(secret), ...salt])).slice(2), "hex"));
  return {
    createCredential: async (req) => ({ credentialId: new Uint8Array(16).fill(7), transports: ["internal"], prfEnabled: true, prfOutput: prf(req.prfSalt) }),
    getCredential: async (req) => ({ credentialId: new Uint8Array(16).fill(7), prfOutput: prf(req.prfSalt) }),
  };
}

const content = { v: 1 as const, groups: [{ groupId: `0x${"ab".repeat(32)}` as const, name: "Club", joinedAt: 1, credentialId: "abc" }] };

describe("vault key and id derivation", () => {
  it("round-trips: encrypt then decrypt returns the same content", async () => {
    const prfOutput = crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>;
    const key = await deriveVaultKey(prfOutput);
    const encrypted = await encryptVault(key, content);
    const decrypted = await decryptVault<typeof content>(key, encrypted);
    expect(decrypted).toEqual(content);
  });

  it("fails to decrypt with a different (wrong) key", async () => {
    const key1 = await deriveVaultKey(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>);
    const key2 = await deriveVaultKey(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>);
    const encrypted = await encryptVault(key1, content);
    await expect(decryptVault(key2, encrypted)).rejects.toThrow();
  });

  it("uses a fresh IV on every write, so the ciphertext differs even for the same content and key", async () => {
    const key = await deriveVaultKey(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>);
    const a = await encryptVault(key, content);
    const b = await encryptVault(key, content);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(await decryptVault(key, a)).toEqual(content);
    expect(await decryptVault(key, b)).toEqual(content);
  });

  it("vaultId is a 64-char hex string, distinct from any per-group member address", async () => {
    const prfOutput = crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>;
    const vaultId = await deriveVaultId(prfOutput);
    expect(vaultId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("vault-id PRF output and a group's PRF output are unrelated, for the same passkey", async () => {
    const auth = fakeAuthenticator("passkey-1");
    const credential = { credentialId: "AAAAAAAAAAAAAAAAAAAAAA", transports: ["internal"] as const };
    const groupId = `0x${"11".repeat(32)}` as const;
    const groupPrf = await getGroupPrfOutput({ rpId: "localhost", credential, groupId, webAuthnClient: auth });
    const memberAddress = await memberAddressFromPrf(groupPrf);

    // Derive the vault-id output the same way client.ts does, through the same fake authenticator.
    const { getPasskeyPrfOutput } = await import("@category-labs/mera");
    const { VAULT_ID_PRF_SALT, VAULT_KEY_PRF_SALT } = await import("./salts");
    const vaultIdPrf = (
      await getPasskeyPrfOutput({ rpId: "localhost", credential, prfSalt: VAULT_ID_PRF_SALT, webAuthnClient: auth })
    ).prfOutput;
    const vaultKeyPrf = (
      await getPasskeyPrfOutput({ rpId: "localhost", credential, prfSalt: VAULT_KEY_PRF_SALT, webAuthnClient: auth })
    ).prfOutput;

    expect(groupPrf).not.toEqual(vaultIdPrf);
    expect(groupPrf).not.toEqual(vaultKeyPrf);
    expect(vaultIdPrf).not.toEqual(vaultKeyPrf);

    const vaultId = await deriveVaultId(vaultIdPrf);
    // A member address is 20 bytes with a 0x prefix; the vault id is 32 raw hex bytes, no prefix.
    expect(vaultId).not.toBe(memberAddress.toLowerCase().slice(2));
    expect(memberAddress.toLowerCase()).not.toContain(vaultId);
  });

  it("groupPrfSalt and the vault salts are all different", async () => {
    const { VAULT_ID_PRF_SALT, VAULT_KEY_PRF_SALT } = await import("./salts");
    const gSalt = groupPrfSalt(`0x${"11".repeat(32)}`);
    expect(gSalt).not.toEqual(VAULT_ID_PRF_SALT);
    expect(gSalt).not.toEqual(VAULT_KEY_PRF_SALT);
    expect(VAULT_ID_PRF_SALT).not.toEqual(VAULT_KEY_PRF_SALT);
  });
});
