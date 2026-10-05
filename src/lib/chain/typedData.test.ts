import { describe, expect, it } from "vitest";
import {
  digestCreateGroup,
  digestCreateProposal,
  digestInvite,
  digestJoin,
  digestVote,
  toRsvSignature,
} from "./typedData";
import {
  VECTOR_ADMIN,
  VECTOR_CHAIN_ID,
  VECTOR_DEADLINE,
  VECTOR_GROUP,
  VECTOR_INVITE,
  VECTOR_MEMBER,
  VECTOR_PROPOSAL,
  VECTOR_VERIFYING_CONTRACT,
} from "./typedData.vector";

const domain = { verifyingContract: VECTOR_VERIFYING_CONTRACT, chainId: VECTOR_CHAIN_ID };

// Same values as contracts/test/Votalo.t.sol (test_typedDataVectorsMatchClient).
describe("EIP-712 digests match the contract", () => {
  it("createGroup", () => {
    expect(digestCreateGroup({ groupId: VECTOR_GROUP, mode: 1, admin: VECTOR_ADMIN, name: "Club" }, domain)).toBe(
      "0x8ab0b6dc62c9bf54f7a3b5fea23459683f1bf04a05845dafccf395328b68ba0a",
    );
  });
  it("join", () => {
    expect(digestJoin({ groupId: VECTOR_GROUP, member: VECTOR_MEMBER }, domain)).toBe(
      "0x6f4111fc562d6487ef6ed6599f5da91061caa80d6ad1dd214e2020af95b3c1a3",
    );
  });
  it("invite", () => {
    expect(digestInvite({ groupId: VECTOR_GROUP, inviteId: VECTOR_INVITE }, domain)).toBe(
      "0xaadb20b988a6e2e8d93552e5a4765970ef48b324e3198fde0883ffc8a0fd6bb9",
    );
  });
  it("createProposal", () => {
    expect(
      digestCreateProposal(
        {
          groupId: VECTOR_GROUP,
          proposalId: VECTOR_PROPOSAL,
          author: VECTOR_ADMIN,
          title: "Pizza?",
          options: ["Yes", "No"],
          deadline: VECTOR_DEADLINE,
        },
        domain,
      ),
    ).toBe("0x6554f5824af9e3559dce845eaafe24714f9ef611cb88cd6d30e667b6a651541f");
  });
  it("vote", () => {
    expect(digestVote({ proposalId: VECTOR_PROPOSAL, member: VECTOR_MEMBER, choice: 1 }, domain)).toBe(
      "0xb8499edc6a9dc44de133af2d18dd766a9ff32a8f1dce51bfc2247ca1d11c576f",
    );
  });
});

describe("toRsvSignature", () => {
  it("packs r, s and v = 27 + recovery", () => {
    const compact = new Uint8Array(64).fill(0xab);
    expect(toRsvSignature({ compact, recovery: 1 })).toBe(`0x${"ab".repeat(64)}1c`);
    expect(toRsvSignature({ compact, recovery: 0 })).toBe(`0x${"ab".repeat(64)}1b`);
  });
});
