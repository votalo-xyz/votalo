"use client";

import { bytesToHex, type Address, type Hex } from "viem";
import { RelayClientError } from "@/lib/flows/relayClient";
import { memberAddressFromPrf } from "@/lib/identity/memberKey";
import { getGroupPrfOutput, type PasskeyCredential } from "@/lib/identity/passkey";
import { currentRpId } from "@/lib/identity/rpId";
import { getStoreSnapshot, updateStore } from "./store";
import type { GroupMode } from "./types";

/**
 * Actions the screens call. Until the relay and the indexer are wired in, they run the real passkey
 * prompt (so the member's per-group address is genuine) and record the outcome in this browser.
 * Swap each body for the matching flow in `@/lib/flows/votalo` when Phase 4 lands; the signatures
 * and the errors they throw (`RelayClientError`) already match.
 */

type Common = { credential: PasskeyCredential };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowSeconds = () => Math.floor(Date.now() / 1000);

function randomHex32(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/** One passkey prompt. The PRF output is zeroed before this returns and never stored. */
async function promptMemberAddress({ credential }: Common, groupId: Hex): Promise<Address> {
  const prf = await getGroupPrfOutput({ rpId: currentRpId(), credential, groupId });
  try {
    return await memberAddressFromPrf(prf);
  } finally {
    prf.fill(0);
  }
}

export async function joinGroup(args: Common & { groupId: Hex }) {
  if (getStoreSnapshot().members[args.groupId]) throw new RelayClientError("AlreadyMember", 409);
  const address = await promptMemberAddress(args, args.groupId);
  await pause(600);
  updateStore((s) => ({ ...s, members: { ...s.members, [args.groupId]: { address, joinedAt: nowSeconds() } } }));
  return { member: address };
}

export async function castVote(args: Common & { groupId: Hex; proposalId: Hex; choice: number; deadline: number }) {
  const store = getStoreSnapshot();
  if (!store.members[args.groupId]) throw new RelayClientError("NotMember", 403);
  if (store.votes[args.proposalId] !== undefined) throw new RelayClientError("AlreadyVoted", 409);
  if (nowSeconds() >= args.deadline) throw new RelayClientError("VotingClosed", 409);
  const address = await promptMemberAddress(args, args.groupId);
  await pause(600);
  return { member: address };
}

/** Records a confirmed vote. The screen calls it when the particle lands, so the ring grows in sync. */
export function recordVote(proposalId: Hex, choice: number) {
  updateStore((s) => ({ ...s, votes: { ...s.votes, [proposalId]: choice } }));
}

export async function createGroup(args: Common & { name: string; mode: GroupMode }) {
  const groupId = randomHex32();
  const address = await promptMemberAddress(args, groupId);
  await pause(600);
  updateStore((s) => ({
    ...s,
    groups: [{ id: groupId, name: args.name, mode: args.mode, members: 1, mine: true, demo: false }, ...s.groups],
    members: { ...s.members, [groupId]: { address, joinedAt: nowSeconds() } },
  }));
  return { groupId, admin: address };
}

export async function createProposal(
  args: Common & { groupId: Hex; title: string; options: string[]; deadlineSeconds: number },
) {
  if (!getStoreSnapshot().members[args.groupId]) throw new RelayClientError("NotMember", 403);
  const proposalId = randomHex32();
  await promptMemberAddress(args, args.groupId);
  await pause(600);
  const createdAt = nowSeconds();
  updateStore((s) => ({
    ...s,
    proposals: [
      {
        id: proposalId,
        groupId: args.groupId,
        title: args.title,
        options: args.options,
        counts: args.options.map(() => 0),
        deadline: createdAt + args.deadlineSeconds,
        createdAt,
        mine: true,
        demo: false,
      },
      ...s.proposals,
    ],
  }));
  return { proposalId };
}
