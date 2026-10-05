import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes, toHex, type Hex } from "viem";
import { groupPrfSalt } from "./groupSalt";
import { memberAddressFromPrf, signDigestAsMember } from "./memberKey";
import { createVotaloPasskey, getGroupPrfOutput, isPrfUnavailable } from "./passkey";
import type { WebAuthnClient } from "@category-labs/mera";

const GROUP_A = `0x${"11".repeat(32)}` as Hex;
const GROUP_B = `0x${"22".repeat(32)}` as Hex;
const CRED_ID = new Uint8Array(16).fill(7);

// Simulated authenticator: PRF(salt) = keccak256(secret || salt). Stable for one passkey, unrelated across salts.
function fakeAuthenticator(secret: string, prfEnabledOnCreate = true): WebAuthnClient {
  const prf = (salt: Uint8Array): Uint8Array<ArrayBuffer> =>
    new Uint8Array(Buffer.from(keccak256(new Uint8Array([...stringToBytes(secret), ...salt])).slice(2), "hex"));
  return {
    createCredential: async (req) => ({
      credentialId: CRED_ID,
      transports: ["internal"],
      prfEnabled: prfEnabledOnCreate,
      prfOutput: prfEnabledOnCreate ? prf(req.prfSalt) : undefined,
    }),
    getCredential: async (req) => ({
      credentialId: CRED_ID,
      prfOutput: prf(req.prfSalt),
    }),
  };
}

const credential = { credentialId: "AAAAAAAAAAAAAAAAAAAAAA", transports: ["internal"] as const };

describe("groupPrfSalt", () => {
  it("is 32 bytes and follows keccak256(prefix || groupId)", () => {
    const salt = groupPrfSalt(GROUP_A);
    expect(salt.length).toBe(32);
    const expected = keccak256(new Uint8Array([...stringToBytes("votalo/group/v1/"), ...Buffer.from(GROUP_A.slice(2), "hex")]));
    expect(toHex(salt)).toBe(expected);
  });

  it("rejects a groupId that is not bytes32", () => {
    expect(() => groupPrfSalt("0x1234" as Hex)).toThrow();
  });
});

describe("same passkey, same group", () => {
  it("gives the same member address on every call", async () => {
    const auth = fakeAuthenticator("passkey-1");
    const prf1 = await getGroupPrfOutput({ rpId: "localhost", credential, groupId: GROUP_A, webAuthnClient: auth });
    const prf2 = await getGroupPrfOutput({ rpId: "localhost", credential, groupId: GROUP_A, webAuthnClient: auth });
    const a1 = await memberAddressFromPrf(prf1);
    const a2 = await memberAddressFromPrf(prf2);
    expect(a1).toBe(a2);
    expect(a1).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});

describe("same passkey, different group", () => {
  it("gives different, unrelated member addresses", async () => {
    const auth = fakeAuthenticator("passkey-1");
    const prfA = await getGroupPrfOutput({ rpId: "localhost", credential, groupId: GROUP_A, webAuthnClient: auth });
    const prfB = await getGroupPrfOutput({ rpId: "localhost", credential, groupId: GROUP_B, webAuthnClient: auth });
    expect(prfA).not.toEqual(prfB);
    expect(await memberAddressFromPrf(prfA)).not.toBe(await memberAddressFromPrf(prfB));
  });
});

describe("different passkeys, same group", () => {
  it("give different member addresses", async () => {
    const prf1 = await getGroupPrfOutput({ rpId: "localhost", credential, groupId: GROUP_A, webAuthnClient: fakeAuthenticator("passkey-1") });
    const prf2 = await getGroupPrfOutput({ rpId: "localhost", credential, groupId: GROUP_A, webAuthnClient: fakeAuthenticator("passkey-2") });
    expect(await memberAddressFromPrf(prf1)).not.toBe(await memberAddressFromPrf(prf2));
  });
});

describe("signing", () => {
  it("signs a digest with the member key and reports the matching address", async () => {
    const prf = await getGroupPrfOutput({ rpId: "localhost", credential, groupId: GROUP_A, webAuthnClient: fakeAuthenticator("passkey-1") });
    const digest = new Uint8Array(32).fill(9);
    const { address, signature } = await signDigestAsMember(prf, digest);
    expect(address).toBe(await memberAddressFromPrf(prf));
    expect(signature.compact.length).toBe(64);
    expect([0, 1]).toContain(signature.recovery);
  });
});

describe("passkey creation", () => {
  it("returns credential metadata without key material", async () => {
    const cred = await createVotaloPasskey({ rpId: "localhost", displayName: "Ana", webAuthnClient: fakeAuthenticator("passkey-1") });
    expect(Object.keys(cred).sort()).toEqual(["credentialId", "transports"]);
  });

  it("reports PRF_UNAVAILABLE when the authenticator does not enable PRF", async () => {
    const err = await createVotaloPasskey({
      rpId: "localhost",
      displayName: "Ana",
      webAuthnClient: fakeAuthenticator("passkey-1", false),
    }).catch((e: unknown) => e);
    expect(isPrfUnavailable(err)).toBe(true);
  });
});
