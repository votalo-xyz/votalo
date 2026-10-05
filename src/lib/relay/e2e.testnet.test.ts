/**
 * End-to-end on Monad testnet through the relay routes. Runs only when E2E_BASE_URL is set, for
 * example E2E_BASE_URL=http://localhost:3000 with RELAYER_PRIVATE_KEY set on that server. The
 * relayer pays gas; the members here are fresh random keys (members never pay gas).
 */
import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bytesToHex, type Hex } from "viem";
import { digestCreateGroup, digestCreateProposal, digestJoin, digestVote } from "../chain/typedData";
import { getGroup, getProposal } from "../chain/read";

const BASE = process.env.E2E_BASE_URL;
const d = BASE ? describe : describe.skip;

const rand32 = (): Hex => bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

async function post(route: string, body: unknown) {
  const res = await fetch(`${BASE}/api/relay/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as { txHash?: Hex; error?: string } };
}

d("testnet end to end", () => {
  it("create group, join, propose, vote, and refuse a second vote", async () => {
    const admin = privateKeyToAccount(generatePrivateKey());
    const alice = privateKeyToAccount(generatePrivateKey());
    const bob = privateKeyToAccount(generatePrivateKey());
    const groupId = rand32();
    const proposalId = rand32();
    const txs: Record<string, string> = {};

    // 1. create group (OPEN)
    const cgDigest = digestCreateGroup({ groupId, mode: 0, admin: admin.address, name: "Club e2e" });
    const cg = await post("create-group", {
      groupId,
      mode: 0,
      admin: admin.address,
      name: "Club e2e",
      signature: await signWith(admin, cgDigest),
    });
    expect(cg.status, JSON.stringify(cg.body)).toBe(200);
    txs.createGroup = cg.body.txHash!;

    // 2. join alice and bob
    for (const [label, m] of [["joinAlice", alice], ["joinBob", bob]] as const) {
      const jd = digestJoin({ groupId, member: m.address });
      const j = await post("join", { groupId, member: m.address, signature: await signWith(m, jd) });
      expect(j.status, JSON.stringify(j.body)).toBe(200);
      txs[label] = j.body.txHash!;
    }

    // 3. proposal by admin, deadline one hour out
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const options = ["Pizza", "Tacos"];
    const pd = digestCreateProposal({ groupId, proposalId, author: admin.address, title: "Lunch?", options, deadline });
    const cp = await post("create-proposal", {
      groupId,
      proposalId,
      author: admin.address,
      title: "Lunch?",
      options,
      deadline: deadline.toString(),
      signature: await signWith(admin, pd),
    });
    expect(cp.status, JSON.stringify(cp.body)).toBe(200);
    txs.createProposal = cp.body.txHash!;

    // 4. votes
    const v1 = await post("vote", {
      proposalId,
      member: alice.address,
      choice: 0,
      signature: await signWith(alice, digestVote({ proposalId, member: alice.address, choice: 0 })),
    });
    expect(v1.status, JSON.stringify(v1.body)).toBe(200);
    txs.voteAlice = v1.body.txHash!;
    const v2 = await post("vote", {
      proposalId,
      member: bob.address,
      choice: 1,
      signature: await signWith(bob, digestVote({ proposalId, member: bob.address, choice: 1 })),
    });
    expect(v2.status, JSON.stringify(v2.body)).toBe(200);
    txs.voteBob = v2.body.txHash!;

    // 5. second vote by alice is refused by simulation (no gas spent)
    const again = await post("vote", {
      proposalId,
      member: alice.address,
      choice: 1,
      signature: await signWith(alice, digestVote({ proposalId, member: alice.address, choice: 1 })),
    });
    expect(again.status).toBe(422);
    expect(again.body.error).toBe("AlreadyVoted");

    // 6. on-chain state
    const g = await getGroup(groupId);
    expect(g.exists).toBe(true);
    expect(g.memberCount).toBe(3n);
    expect((await getProposal(proposalId)).counts).toEqual([1n, 1n]);

    console.log("E2E tx hashes:", JSON.stringify(txs, null, 2));
  });
});

async function signWith(account: ReturnType<typeof privateKeyToAccount>, digest: Hex): Promise<Hex> {
  return (await account.sign({ hash: digest })) as Hex;
}
