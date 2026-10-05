"use client";

import { bytesToHex, type Address, type Hex } from "viem";
import * as flows from "@/lib/flows/votalo";
import { RelayClientError } from "@/lib/flows/relayClient";
import { memberAddressFromPrf } from "@/lib/identity/memberKey";
import { getGroupPrfOutput, type PasskeyCredential } from "@/lib/identity/passkey";
import { currentRpId } from "@/lib/identity/rpId";
import { resolveDataMode } from "./mode";
import { invalidateRemote } from "./remote";
import { getStoreSnapshot, updateStore } from "./store";
import type { GroupMode } from "./types";

/**
 * Everything the screens do to data. When the server has an indexer configured (`live`, see ./mode) each
 * action is the real sign-and-relay flow; otherwise the action still runs the real passkey prompt (so the
 * member's per-group address is genuine) and records the outcome in this browser. Both paths throw
 * `RelayClientError` with the codes the relay uses, so error handling is the same.
 */

type Common = { credential: PasskeyCredential };
export type Invite = { inviteId: Hex; adminInviteSig: Hex };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowSeconds = () => Math.floor(Date.now() / 1000);
const rp = () => currentRpId();

/**
 * Whether this action should really be sent. If the server cannot be asked, the action fails instead of
 * guessing: guessing "local" would record a vote in this browser that never reaches the group.
 */
async function isLive(): Promise<boolean> {
  try {
    return (await resolveDataMode()) === "live";
  } catch {
    throw new RelayClientError("NETWORK", 0);
  }
}

function randomHex(bytes: number): Hex {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return bytesToHex(buffer);
}

/** One passkey prompt. The PRF output is zeroed before this returns and never stored. */
async function promptMemberAddress({ credential }: Common, groupId: Hex): Promise<Address> {
  const prf = await getGroupPrfOutput({ rpId: rp(), credential, groupId });
  try {
    return await memberAddressFromPrf(prf);
  } finally {
    prf.fill(0);
  }
}

function rememberMember(groupId: Hex, address: Address) {
  updateStore((s) => ({ ...s, members: { ...s.members, [groupId]: { address, joinedAt: nowSeconds() } } }));
}

export async function createGroup(args: Common & { name: string; mode: GroupMode }) {
  const live = await isLive();
  let groupId: Hex;
  let admin: Address;
  if (live) {
    ({ groupId, admin } = await flows.createGroup({
      rpId: rp(),
      credential: args.credential,
      name: args.name,
      mode: args.mode === "invite" ? 1 : 0,
    }));
  } else {
    groupId = randomHex(32);
    admin = await promptMemberAddress(args, groupId);
    await pause(600);
  }
  updateStore((s) => ({
    ...s,
    groups: [{ id: groupId, name: args.name, mode: args.mode, members: 1, mine: true, demo: false }, ...s.groups],
    members: { ...s.members, [groupId]: { address: admin, joinedAt: nowSeconds() } },
  }));
  invalidateRemote();
  return { groupId, admin };
}

/** The group admin signs a single-use invite. Put both values in the link. */
export async function createInvite(args: Common & { groupId: Hex }): Promise<Invite> {
  if (await isLive()) return flows.createInvite({ rpId: rp(), credential: args.credential, groupId: args.groupId });
  await promptMemberAddress(args, args.groupId);
  await pause(400);
  return { inviteId: randomHex(32), adminInviteSig: randomHex(65) };
}

export async function joinGroup(args: Common & { groupId: Hex; mode: GroupMode; invite?: Invite }) {
  if (getStoreSnapshot().members[args.groupId]) throw new RelayClientError("AlreadyMember", 409);
  const live = await isLive();
  let member: Address;
  if (live) {
    ({ member } = await flows.joinGroup({
      rpId: rp(),
      credential: args.credential,
      groupId: args.groupId,
      invite: args.invite,
    }));
  } else {
    if (args.mode === "invite" && !args.invite) throw new RelayClientError("InviteRequired", 403);
    member = await promptMemberAddress(args, args.groupId);
    await pause(600);
  }
  rememberMember(args.groupId, member);
  invalidateRemote();
  return { member };
}

/** Signs and sends a vote. It does not change the screen's counts: call `recordVote` when it lands. */
export async function castVote(args: Common & { groupId: Hex; proposalId: Hex; choice: number; deadline: number }) {
  const store = getStoreSnapshot();
  if (!store.members[args.groupId]) throw new RelayClientError("NotMember", 403);
  if (store.votes[args.proposalId] !== undefined) throw new RelayClientError("AlreadyVoted", 409);
  if (nowSeconds() >= args.deadline) throw new RelayClientError("VotingClosed", 409);
  if (await isLive()) {
    await flows.castVote({
      rpId: rp(),
      credential: args.credential,
      groupId: args.groupId,
      proposalId: args.proposalId,
      choice: args.choice,
    });
  } else {
    await promptMemberAddress(args, args.groupId);
    await pause(600);
  }
}

/**
 * Records a confirmed vote. The screen calls it when the particle lands, so the ring grows in sync.
 * `baseline` is the total shown before the vote; see the store for how it stops double counting.
 */
export function recordVote(proposalId: Hex, choice: number, baseline: number) {
  updateStore((s) => ({ ...s, votes: { ...s.votes, [proposalId]: { choice, baseline } } }));
  invalidateRemote();
}

export async function createProposal(
  args: Common & { groupId: Hex; title: string; options: string[]; deadlineSeconds: number },
) {
  if (!getStoreSnapshot().members[args.groupId]) throw new RelayClientError("NotMember", 403);
  const live = await isLive();
  let proposalId: Hex;
  if (live) {
    ({ proposalId } = await flows.createProposal({
      rpId: rp(),
      credential: args.credential,
      groupId: args.groupId,
      title: args.title,
      options: args.options,
      deadlineSeconds: args.deadlineSeconds,
    }));
  } else {
    proposalId = randomHex(32);
    await promptMemberAddress(args, args.groupId);
    await pause(600);
  }
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
  invalidateRemote();
  return { proposalId };
}
