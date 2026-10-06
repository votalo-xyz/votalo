import { beforeEach, describe, expect, it, vi } from "vitest";
import { keccak256, stringToBytes, type Hex } from "viem";
import type { WebAuthnClient } from "@category-labs/mera";
import { restoreVault, restoreVaultFromPasskey, saveVault } from "./client";
import { clearVaultSession } from "./session";
import type { VaultGroupEntry } from "./types";

// A simulated authenticator that counts every PRF evaluation. Each one is one passkey prompt.
function countingAuthenticator(secret: string) {
  let prompts = 0;
  const prf = (salt: Uint8Array): Uint8Array<ArrayBuffer> =>
    new Uint8Array(Buffer.from(keccak256(new Uint8Array([...stringToBytes(secret), ...salt])).slice(2), "hex"));
  const client: WebAuthnClient = {
    createCredential: async (req) => {
      prompts += 1;
      return { credentialId: new Uint8Array(16).fill(7), transports: ["internal"], prfEnabled: true, prfOutput: prf(req.prfSalt) };
    },
    getCredential: async (req) => {
      prompts += 1;
      return { credentialId: new Uint8Array(16).fill(7), prfOutput: prf(req.prfSalt) };
    },
  };
  return { client, prompts: () => prompts };
}

const CRED = { credentialId: "BwcHBwcHBwcHBwcHBwcHBw", transports: ["internal"] as const };
const GROUP_A: VaultGroupEntry = {
  groupId: `0x${"aa".repeat(32)}` as Hex,
  name: "Vótalo Ñandú",
  joinedAt: 1_700_000_000,
  credentialId: CRED.credentialId,
  memberAddress: `0x${"12".repeat(20)}` as Hex,
};
const GROUP_B: VaultGroupEntry = { ...GROUP_A, groupId: `0x${"bb".repeat(32)}` as Hex, name: "Club B" };

// In-memory stand-in for /api/vault/:id. The real route stores only { iv, ciphertext }.
let server: Map<string, string>;

beforeEach(() => {
  clearVaultSession();
  server = new Map();
  vi.stubGlobal(
    "fetch",
    async (url: string, init?: RequestInit) => {
      const id = url.split("/").pop() as string;
      if (init?.method === "PUT") {
        server.set(id, init.body as string);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      const body = server.get(id);
      if (!body) return new Response(JSON.stringify({ error: "NOT_FOUND" }), { status: 404 });
      return new Response(body, { status: 200 });
    },
  );
});

describe("prompt counts", () => {
  it("first save asks once, later saves in the same page session ask nothing", async () => {
    const auth = countingAuthenticator("passkey-1");
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A] });
    expect(auth.prompts()).toBe(1);
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A, GROUP_B] });
    expect(auth.prompts()).toBe(1);
  });

  it("restore in the same page session asks nothing", async () => {
    const auth = countingAuthenticator("passkey-1");
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A] });
    const before = auth.prompts();
    const groups = await restoreVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client });
    expect(auth.prompts()).toBe(before);
    expect(groups).toEqual([GROUP_A]);
  });

  it("restore on a cleared device asks once", async () => {
    const auth = countingAuthenticator("passkey-1");
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A, GROUP_B] });
    clearVaultSession(); // a new device, or a cleared page
    const before = auth.prompts();
    const groups = await restoreVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client });
    expect(auth.prompts() - before).toBe(1);
    expect(groups).toEqual([GROUP_A, GROUP_B]);
  });

  it("a device with no passkey saved restores the list with one prompt, and gets the credential back", async () => {
    const auth = countingAuthenticator("passkey-1");
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A] });
    clearVaultSession();
    const found = await restoreVaultFromPasskey({ rpId: "localhost", webAuthnClient: auth.client });
    expect(found.credential.credentialId).toBe(CRED.credentialId);
    expect(found.groups).toEqual([GROUP_A]);
  });

  it("restoring a passkey that never saved a list returns null, not an error", async () => {
    const auth = countingAuthenticator("never-saved");
    expect(await restoreVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client })).toBeNull();
    const found = await restoreVaultFromPasskey({ rpId: "localhost", webAuthnClient: auth.client });
    expect(found.groups).toBeNull();
  });
});

describe("what the server sees", () => {
  it("stores only { iv, ciphertext }, and no plaintext name or id appears in it", async () => {
    const auth = countingAuthenticator("passkey-1");
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A] });
    const [stored] = [...server.values()];
    expect(Object.keys(JSON.parse(stored)).sort()).toEqual(["ciphertext", "iv"]);
    expect(stored).not.toContain("Vótalo");
    expect(stored).not.toContain(GROUP_A.groupId.slice(2));
  });

  it("a fresh save writes a different ciphertext for the same list", async () => {
    const auth = countingAuthenticator("passkey-1");
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A] });
    const first = [...server.values()][0];
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: auth.client, groups: [GROUP_A] });
    expect([...server.values()][0]).not.toBe(first);
  });
});

describe("a different passkey", () => {
  it("cannot find another passkey's vault (its vault id is different), so restore returns null", async () => {
    const mine = countingAuthenticator("mine");
    const theirs = countingAuthenticator("theirs");
    await saveVault({ rpId: "localhost", credential: CRED, webAuthnClient: mine.client, groups: [GROUP_A] });
    clearVaultSession();
    expect(await restoreVault({ rpId: "localhost", credential: CRED, webAuthnClient: theirs.client })).toBeNull();
  });
});

describe("passkey creation primes the vault session", () => {
  it("creating the passkey makes the first save ask nothing more", async () => {
    const { createVotaloPasskey } = await import("../identity/passkey");
    const auth = countingAuthenticator("fresh-passkey");
    const cred = await createVotaloPasskey({ rpId: "localhost", displayName: "Ana", webAuthnClient: auth.client });
    expect(auth.prompts()).toBe(1);
    await saveVault({ rpId: "localhost", credential: cred, webAuthnClient: auth.client, groups: [GROUP_A] });
    expect(auth.prompts()).toBe(1);
  });
});
