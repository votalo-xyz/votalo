import { beforeEach, describe, expect, it } from "vitest";
import { clearVaultSession, getVaultSession, setVaultSession, type VaultSession } from "./session";

const IDLE_MS = 15 * 60_000;

async function fakeSession(id: string): Promise<VaultSession> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { vaultId: id, vaultKey: key };
}

describe("vault session (in memory only)", () => {
  beforeEach(() => clearVaultSession());

  it("returns the session that was set, while it is fresh", async () => {
    const s = await fakeSession("a".repeat(64));
    setVaultSession(s, 1000);
    expect(getVaultSession(1000 + 60_000)?.vaultId).toBe("a".repeat(64));
  });

  it("ends after the idle timeout", async () => {
    setVaultSession(await fakeSession("b".repeat(64)), 1000);
    expect(getVaultSession(1000 + IDLE_MS + 1)).toBeNull();
  });

  it("each read extends the idle timeout", async () => {
    setVaultSession(await fakeSession("c".repeat(64)), 1000);
    // Read at 10 minutes, so it is still alive at 20 minutes, which is past the original 15-minute window.
    expect(getVaultSession(1000 + 10 * 60_000)).not.toBeNull();
    expect(getVaultSession(1000 + 20 * 60_000)).not.toBeNull();
  });

  it("clearVaultSession (sign-out) removes the session immediately", async () => {
    setVaultSession(await fakeSession("d".repeat(64)), 1000);
    clearVaultSession();
    expect(getVaultSession(1000)).toBeNull();
  });

  it("holds the key as a non-extractable CryptoKey, not as bytes", async () => {
    const s = await fakeSession("e".repeat(64));
    expect(s.vaultKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", s.vaultKey)).rejects.toThrow();
  });
});
