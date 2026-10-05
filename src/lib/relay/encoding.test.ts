import { describe, expect, it } from "vitest";
import { digestCreateGroup, digestCreateProposal } from "../chain/typedData";

// Spanish names and titles must keep their accents end to end. A group name is UTF-8 in the relay
// request, the signed digest, the event log and the indexer, so every step should agree on the bytes.
const NAME = "Vótalo Ñandú Éxito Íntimo Ópera Úrsula Mañana";

const admin = "0x1000000000000000000000000000000000000002" as const;
const groupId = `0x${"11".repeat(32)}` as const;

describe("UTF-8 round trip for Spanish text", () => {
  it("encodes á é í ó ú ñ as UTF-8 bytes, not Latin-1", () => {
    const bytes = new TextEncoder().encode("ó");
    expect([...bytes]).toEqual([0xc3, 0xb3]);
    expect(new TextDecoder("utf-8").decode(new Uint8Array([0xc3, 0xb3]))).toBe("ó");
  });

  it("the signed digest is the same after the name goes through a UTF-8 JSON round trip", () => {
    // The browser sends JSON as UTF-8; the relay parses it back. The digest must not change.
    const body = JSON.stringify({ name: NAME });
    const parsed = JSON.parse(new TextDecoder().decode(new TextEncoder().encode(body))) as { name: string };
    expect(parsed.name).toBe(NAME);
    expect(digestCreateGroup({ groupId, mode: 0, admin, name: parsed.name })).toBe(
      digestCreateGroup({ groupId, mode: 0, admin, name: NAME }),
    );
  });

  it("a proposal title and option with accents round-trip the same way", () => {
    const title = "¿Qué comemos mañana?";
    const options = ["Sí", "Tal vez"];
    const deadline = 1_700_000_000n;
    const parsed = JSON.parse(JSON.stringify({ title, options })) as { title: string; options: string[] };
    expect(
      digestCreateProposal({ groupId, proposalId: groupId, author: admin, title: parsed.title, options: parsed.options, deadline }),
    ).toBe(digestCreateProposal({ groupId, proposalId: groupId, author: admin, title, options, deadline }));
  });

  it("a name that was mis-decoded as Latin-1 would produce a different digest (guards the regression)", () => {
    const misdecoded = new TextDecoder("latin1").decode(new TextEncoder().encode(NAME));
    expect(misdecoded).not.toBe(NAME);
    expect(digestCreateGroup({ groupId, mode: 0, admin, name: misdecoded })).not.toBe(
      digestCreateGroup({ groupId, mode: 0, admin, name: NAME }),
    );
  });
});
