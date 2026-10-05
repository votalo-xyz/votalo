import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { digestCreateGroup, digestVote, toRsvSignature } from "../chain/typedData";
import { GAS_LIMITS } from "./gas";

const relayAction = vi.fn(async () => "0xabc123" as Hex);
vi.mock("./chain", () => ({ relayAction: (...a: unknown[]) => relayAction(...(a as [])), mapRevert: () => new Error("x") }));

const { handleRelay } = await import("./handler");

// Fresh random keys per run. No key material is committed.
const admin = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());
const GROUP = `0x${"11".repeat(32)}` as Hex;

async function sign(account: ReturnType<typeof privateKeyToAccount>, digest: Hex): Promise<Hex> {
  const sig = await account.sign({ hash: digest });
  return sig as Hex;
}

function req(route: string, body: unknown, ip: string): Request {
  return new Request(`http://test/api/relay/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => relayAction.mockClear());

describe("createGroup relay", () => {
  it("relays a valid signed action with the createGroup gas limit", async () => {
    const digest = digestCreateGroup({ groupId: GROUP, mode: 0, admin: admin.address, name: "Club" });
    const signature = await sign(admin, digest);
    const res = await handleRelay(
      req("create-group", { groupId: GROUP, mode: 0, admin: admin.address, name: "Club", signature }, "10.0.0.1"),
      "createGroup",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ txHash: "0xabc123" });
    expect(relayAction).toHaveBeenCalledWith("createGroup", expect.any(Array), GAS_LIMITS.createGroup);
  });

  it("rejects a signature from another key without touching the chain", async () => {
    const digest = digestCreateGroup({ groupId: GROUP, mode: 0, admin: admin.address, name: "Club" });
    const signature = await sign(other, digest);
    const res = await handleRelay(
      req("create-group", { groupId: GROUP, mode: 0, admin: admin.address, name: "Club", signature }, "10.0.0.2"),
      "createGroup",
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "InvalidSignature" });
    expect(relayAction).not.toHaveBeenCalled();
  });

  it("rejects malformed input before any signature check", async () => {
    const res = await handleRelay(
      req("create-group", { groupId: "0x1234", mode: 0, admin: admin.address, name: "Club", signature: "0x" }, "10.0.0.3"),
      "createGroup",
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_INPUT:groupId" });
  });

  it("rejects a name over 80 bytes", async () => {
    const res = await handleRelay(
      req("create-group", { groupId: GROUP, mode: 0, admin: admin.address, name: "a".repeat(81), signature: `0x${"00".repeat(65)}` }, "10.0.0.4"),
      "createGroup",
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const r = new Request("http://test/x", { method: "POST", headers: { "x-forwarded-for": "10.0.0.5" }, body: "nope" });
    const res = await handleRelay(r, "createGroup");
    expect(res.status).toBe(400);
  });
});

describe("vote relay", () => {
  it("relays a valid vote with the vote gas limit", async () => {
    const proposalId = `0x${"22".repeat(32)}` as Hex;
    const digest = digestVote({ proposalId, member: admin.address, choice: 1 });
    const signature = await sign(admin, digest);
    const res = await handleRelay(
      req("vote", { proposalId, member: admin.address, choice: 1, signature }, "10.0.0.6"),
      "vote",
    );
    expect(res.status).toBe(200);
    expect(relayAction).toHaveBeenCalledWith("vote", expect.any(Array), GAS_LIMITS.vote);
  });

  it("rejects a choice above 255", async () => {
    const res = await handleRelay(
      req("vote", { proposalId: `0x${"22".repeat(32)}`, member: admin.address, choice: 256, signature: `0x${"00".repeat(65)}` }, "10.0.0.7"),
      "vote",
    );
    expect(res.status).toBe(400);
  });
});

describe("rate limits", () => {
  it("returns 429 after the per-IP window is used up", async () => {
    const ip = "10.9.9.9";
    const digest = digestVote({ proposalId: `0x${"22".repeat(32)}`, member: admin.address, choice: 0 });
    const signature = await sign(admin, digest);
    const body = { proposalId: `0x${"22".repeat(32)}`, member: admin.address, choice: 0, signature };
    let last = 0;
    for (let i = 0; i < 21; i++) {
      last = (await handleRelay(req("vote", body, ip), "vote")).status;
    }
    expect(last).toBe(429);
  });
});

describe("signature packing", () => {
  it("toRsvSignature output is 65 bytes", () => {
    expect(toRsvSignature({ compact: new Uint8Array(64), recovery: 0 }).length).toBe(132);
  });
});
