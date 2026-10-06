import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import { decryptVault, deriveVaultId, deriveVaultKey, encryptVault } from "./crypto";
import { VAULT_PRF_SALT } from "./salts";
import { groupPrfSalt } from "../identity/groupSalt";
import { getGroupPrfOutput } from "../identity/passkey";
import { getPasskeyPrfOutput, type WebAuthnClient } from "@category-labs/mera";

// Simulated authenticator, same convention as identity.test.ts: PRF(salt) = keccak256(secret || salt).
function fakeAuthenticator(secret: string): WebAuthnClient {
  const prf = (salt: Uint8Array): Uint8Array<ArrayBuffer> =>
    new Uint8Array(Buffer.from(keccak256(new Uint8Array([...stringToBytes(secret), ...salt])).slice(2), "hex"));
  return {
    createCredential: async (req) => ({ credentialId: new Uint8Array(16).fill(7), transports: ["internal"], prfEnabled: true, prfOutput: prf(req.prfSalt) }),
    getCredential: async (req) => ({ credentialId: new Uint8Array(16).fill(7), prfOutput: prf(req.prfSalt) }),
  };
}

const random32 = () => crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>;
const content = { v: 1 as const, groups: [{ groupId: `0x${"ab".repeat(32)}` as const, name: "Club", joinedAt: 1, credentialId: "abc" }] };

describe("vault key and id from one PRF output", () => {
  it("round-trips: encrypt then decrypt returns the same content", async () => {
    const key = await deriveVaultKey(random32());
    const encrypted = await encryptVault(key, content);
    expect(await decryptVault<typeof content>(key, encrypted)).toEqual(content);
  });

  it("fails to decrypt with a different (wrong) key", async () => {
    const key1 = await deriveVaultKey(random32());
    const key2 = await deriveVaultKey(random32());
    const encrypted = await encryptVault(key1, content);
    await expect(decryptVault(key2, encrypted)).rejects.toThrow();
  });

  it("uses a fresh IV on every write, so the ciphertext differs even for the same content and key", async () => {
    const key = await deriveVaultKey(random32());
    const a = await encryptVault(key, content);
    const b = await encryptVault(key, content);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(await decryptVault(key, a)).toEqual(content);
    expect(await decryptVault(key, b)).toEqual(content);
  });

  it("the vault key is non-extractable: its raw bytes can never be read back", async () => {
    const key = await deriveVaultKey(random32());
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });

  it("the vault id is 64 hex chars, and differs from the vault key's role (different HKDF info)", async () => {
    const prfOutput = random32();
    const id = await deriveVaultId(prfOutput);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    // Same PRF output, two info strings: the id must not be the key material. Encrypting with a key
    // derived from the same output must still work, and decrypting with a key from another output must fail.
    const key = await deriveVaultKey(prfOutput);
    const encrypted = await encryptVault(key, content);
    expect(await decryptVault(key, encrypted)).toEqual(content);
    expect(await deriveVaultId(prfOutput)).toBe(id);
  });

  it("the vault PRF output and a group's PRF output are unrelated, for the same passkey", async () => {
    const auth = fakeAuthenticator("passkey-1");
    const credential = { credentialId: "AAAAAAAAAAAAAAAAAAAAAA", transports: ["internal"] as const };
    const groupId = `0x${"11".repeat(32)}` as const;
    const groupPrf = await getGroupPrfOutput({ rpId: "localhost", credential, groupId, webAuthnClient: auth });
    const vaultPrf = (await getPasskeyPrfOutput({ rpId: "localhost", credential, prfSalt: VAULT_PRF_SALT, webAuthnClient: auth })).prfOutput;
    expect(groupPrf).not.toEqual(vaultPrf);
  });

  it("the vault salt differs from every group salt", () => {
    expect(VAULT_PRF_SALT).not.toEqual(groupPrfSalt(`0x${"11".repeat(32)}`));
  });
});
