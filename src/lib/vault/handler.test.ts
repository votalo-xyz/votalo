import { describe, expect, it } from "vitest";
import { handleVaultGet, handleVaultPut, type VaultStore } from "./handler";
import { deriveVaultId, deriveVaultKey, encryptVault } from "./crypto";

function fakeStore(): VaultStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    put: async (id, body) => {
      data.set(id, body);
    },
    get: async (id) => data.get(id) ?? null,
  };
}

function req(method: string, body?: unknown, ip = "10.0.0.1"): Request {
  return new Request("http://test/x", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function makeVaultId(): Promise<string> {
  return deriveVaultId(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>);
}

describe("vault PUT", () => {
  it("stores exactly { iv, ciphertext } and nothing else", async () => {
    const store = fakeStore();
    const vaultId = await makeVaultId();
    const key = await deriveVaultKey(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>);
    const encrypted = await encryptVault(key, { v: 1, groups: [] });

    const res = await handleVaultPut(req("PUT", encrypted), vaultId, store);
    expect(res.status).toBe(200);

    const stored = JSON.parse(store.data.get(vaultId)!) as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(["ciphertext", "iv"]);
    expect(stored.iv).toBe(encrypted.iv);
    expect(stored.ciphertext).toBe(encrypted.ciphertext);
  });

  it("rejects an invalid vault id before touching storage", async () => {
    const store = fakeStore();
    const res = await handleVaultPut(req("PUT", { iv: "AAAAAAAAAAAAAAAAAAAA", ciphertext: "AA==" }), "not-a-vault-id", store);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_INPUT:vaultId" });
    expect(store.data.size).toBe(0);
  });

  it("rejects an iv that is not exactly 12 bytes", async () => {
    const store = fakeStore();
    const vaultId = await makeVaultId();
    const res = await handleVaultPut(req("PUT", { iv: Buffer.from("too short").toString("base64"), ciphertext: "AAAA" }), vaultId, store);
    expect(res.status).toBe(400);
  });

  it("rejects a body over the size cap", async () => {
    const store = fakeStore();
    const vaultId = await makeVaultId();
    const huge = Buffer.alloc(20 * 1024, 1).toString("base64");
    const res = await handleVaultPut(req("PUT", { iv: Buffer.alloc(12).toString("base64"), ciphertext: huge }), vaultId, store);
    expect(res.status).toBe(413);
  });

  it("overwrites on a second PUT to the same vault id", async () => {
    const store = fakeStore();
    const vaultId = await makeVaultId();
    const key = await deriveVaultKey(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>);
    const first = await encryptVault(key, { v: 1, groups: [] });
    const second = await encryptVault(key, { v: 1, groups: [{ groupId: "0x1", name: "x", joinedAt: 1, credentialId: "c" }] });

    await handleVaultPut(req("PUT", first), vaultId, store);
    await handleVaultPut(req("PUT", second), vaultId, store);

    const stored = JSON.parse(store.data.get(vaultId)!) as { iv: string };
    expect(stored.iv).toBe(second.iv);
  });

  it("returns 429 after the per-vault-id rate limit is used up", async () => {
    const store = fakeStore();
    const vaultId = await makeVaultId();
    const body = { iv: Buffer.alloc(12).toString("base64"), ciphertext: "AAAA" };
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await handleVaultPut(req("PUT", body, `10.1.1.${i}`), vaultId, store)).status;
    }
    expect(last).toBe(429);
  });
});

describe("vault GET", () => {
  it("returns the stored { iv, ciphertext }", async () => {
    const store = fakeStore();
    const vaultId = await makeVaultId();
    const key = await deriveVaultKey(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>);
    const encrypted = await encryptVault(key, { v: 1, groups: [] });
    await store.put(vaultId, JSON.stringify(encrypted));

    const res = await handleVaultGet(req("GET"), vaultId, store);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(encrypted);
  });

  it("returns 404 when nothing is stored for this vault id", async () => {
    const store = fakeStore();
    const vaultId = await makeVaultId();
    const res = await handleVaultGet(req("GET"), vaultId, store);
    expect(res.status).toBe(404);
  });

  it("rejects an invalid vault id", async () => {
    const store = fakeStore();
    const res = await handleVaultGet(req("GET"), "short", store);
    expect(res.status).toBe(400);
  });
});
