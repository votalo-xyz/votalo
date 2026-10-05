import { hashTypedData, type Address, type Hex } from "viem";
import { MONAD_TESTNET_CHAIN_ID, VOTALO_ADDRESS } from "./config";

/**
 * EIP-712 types for Votalo. Must match contracts/src/Votalo.sol exactly. The pinned digests in
 * typedData.test.ts and contracts/test/Votalo.t.sol keep the two sides in sync.
 */
export const votaloDomain = (verifyingContract: Address = VOTALO_ADDRESS, chainId = MONAD_TESTNET_CHAIN_ID) =>
  ({ name: "Votalo", version: "1", chainId, verifyingContract }) as const;

export const votaloTypes = {
  CreateGroup: [
    { name: "groupId", type: "bytes32" },
    { name: "mode", type: "uint8" },
    { name: "admin", type: "address" },
    { name: "name", type: "string" },
  ],
  Join: [
    { name: "groupId", type: "bytes32" },
    { name: "member", type: "address" },
  ],
  Invite: [
    { name: "groupId", type: "bytes32" },
    { name: "inviteId", type: "bytes32" },
  ],
  CreateProposal: [
    { name: "groupId", type: "bytes32" },
    { name: "proposalId", type: "bytes32" },
    { name: "author", type: "address" },
    { name: "title", type: "string" },
    { name: "options", type: "string[]" },
    { name: "deadline", type: "uint64" },
  ],
  Vote: [
    { name: "proposalId", type: "bytes32" },
    { name: "member", type: "address" },
    { name: "choice", type: "uint8" },
  ],
} as const;

export type CreateGroupMessage = { groupId: Hex; mode: number; admin: Address; name: string };
export type JoinMessage = { groupId: Hex; member: Address };
export type InviteMessage = { groupId: Hex; inviteId: Hex };
export type CreateProposalMessage = {
  groupId: Hex;
  proposalId: Hex;
  author: Address;
  title: string;
  options: readonly string[];
  deadline: bigint;
};
export type VoteMessage = { proposalId: Hex; member: Address; choice: number };

type DomainOpts = { verifyingContract?: Address; chainId?: number };

export function digestCreateGroup(m: CreateGroupMessage, d?: DomainOpts): Hex {
  return hashTypedData({ domain: votaloDomain(d?.verifyingContract, d?.chainId), types: votaloTypes, primaryType: "CreateGroup", message: m });
}
export function digestJoin(m: JoinMessage, d?: DomainOpts): Hex {
  return hashTypedData({ domain: votaloDomain(d?.verifyingContract, d?.chainId), types: votaloTypes, primaryType: "Join", message: m });
}
export function digestInvite(m: InviteMessage, d?: DomainOpts): Hex {
  return hashTypedData({ domain: votaloDomain(d?.verifyingContract, d?.chainId), types: votaloTypes, primaryType: "Invite", message: m });
}
export function digestCreateProposal(m: CreateProposalMessage, d?: DomainOpts): Hex {
  return hashTypedData({ domain: votaloDomain(d?.verifyingContract, d?.chainId), types: votaloTypes, primaryType: "CreateProposal", message: m });
}
export function digestVote(m: VoteMessage, d?: DomainOpts): Hex {
  return hashTypedData({ domain: votaloDomain(d?.verifyingContract, d?.chainId), types: votaloTypes, primaryType: "Vote", message: m });
}

/** 65-byte r || s || v (v = 27 or 28) as the contract's ECDSA.recover expects. */
export function toRsvSignature(sig: { compact: Uint8Array; recovery: 0 | 1 }): Hex {
  const hex = Array.from(sig.compact, (b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}${(27 + sig.recovery).toString(16)}` as Hex;
}
