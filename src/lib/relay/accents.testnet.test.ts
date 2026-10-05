/**
 * Live round trip for a Spanish group name: sign → relay → chain → Envio. Runs only when
 * E2E_BASE_URL and ENVIO_GRAPHQL_URL are set. It spends relayer gas on testnet (one group).
 */
import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bytesToHex, keccak256, stringToBytes, type Hex } from "viem";
import { digestCreateGroup } from "../chain/typedData";
import { getGroup } from "../chain/read";

const BASE = process.env.E2E_BASE_URL;
const ENVIO = process.env.ENVIO_GRAPHQL_URL;
const d = BASE && ENVIO ? describe : describe.skip;

const NAME = "Vótalo Ñandú Éxito Íntimo Ópera Úrsula Mañana";

async function indexedName(groupId: Hex): Promise<string | undefined> {
  const res = await fetch(ENVIO!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "query($id: String!) { Group_by_pk(id: $id) { name } }", variables: { id: groupId } }),
  });
  const body = (await res.json()) as { data?: { Group_by_pk: { name: string } | null } };
  return body.data?.Group_by_pk?.name;
}

d("Spanish group name survives sign → relay → chain → Envio", () => {
  it("returns the exact same accented name from the indexer", async () => {
    const admin = privateKeyToAccount(generatePrivateKey());
    const groupId = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

    const digest = digestCreateGroup({ groupId, mode: 0, admin: admin.address, name: NAME });
    const signature = (await admin.sign({ hash: digest })) as Hex;

    // The body is serialized as UTF-8 JSON, the same as the browser does.
    const res = await fetch(`${BASE}/api/relay/create-group`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ groupId, mode: 0, admin: admin.address, name: NAME, signature }),
    });
    const sent = (await res.json()) as { txHash?: Hex; error?: string };
    expect(res.status, JSON.stringify(sent)).toBe(200);

    // 1. On-chain: the stored name hash is keccak256 of the exact UTF-8 bytes.
    const group = await getGroup(groupId);
    expect(group.exists).toBe(true);
    expect(group.nameHash).toBe(keccak256(stringToBytes(NAME)));

    // 2. Indexed: poll until the hosted indexer has the group, then compare the exact string.
    let name: string | undefined;
    for (let i = 0; i < 60 && name === undefined; i++) {
      name = await indexedName(groupId);
      if (name === undefined) await new Promise((r) => setTimeout(r, 5000));
    }
    expect(name).toBe(NAME);
    console.log("accents round trip", JSON.stringify({ groupId, txHash: sent.txHash, name }));
  }, 400_000);
});
