/**
 * Browser-side flows: passkey -> per-group member key -> signed EIP-712 action -> relay.
 * The PRF output and derived key are zeroed after use and never stored or logged.
 */
import { bytesToHex, hexToBytes, type Address, type Hex } from "viem";
import { getGroupPrfOutput, type PasskeyCredential } from "../identity/passkey";
import { memberAddressFromPrf, signDigestAsMember } from "../identity/memberKey";
import {
  digestCreateGroup,
  digestCreateProposal,
  digestInvite,
  digestJoin,
  digestVote,
  toRsvSignature,
} from "../chain/typedData";
import { postRelay, type RelayRoute } from "./relayClient";

type Common = { rpId: string; credential: PasskeyCredential };

/** Signs a digest as the member of one group. Returns the 65-byte signature and the member address. */
async function signAsMember(c: Common, groupId: Hex, digest: Hex) {
  const prf = await getGroupPrfOutput({ rpId: c.rpId, credential: c.credential, groupId });
  try {
    const { address, signature } = await signDigestAsMember(prf, new Uint8Array(hexToBytes(digest)));
    return { address, signature: toRsvSignature(signature) };
  } finally {
    prf.fill(0);
  }
}

function randomBytes32(): Hex {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  const hex = bytesToHex(b);
  b.fill(0);
  return hex;
}

export type GroupMode = 0 | 1; // 0 = OPEN, 1 = INVITE

/** Creates a group. The caller becomes admin and first member. One passkey prompt. */
export async function createGroup(c: Common & { name: string; mode: GroupMode }) {
  const groupId = randomBytes32();
  const prf = await getGroupPrfOutput({ rpId: c.rpId, credential: c.credential, groupId });
  let admin: Address;
  let signature: Hex;
  try {
    // The admin address comes from the same PRF output, so one prompt covers address and signature.
    admin = await memberAddressFromPrf(prf);
    const digest = digestCreateGroup({ groupId, mode: c.mode, admin, name: c.name });
    const signed = await signDigestAsMember(prf, new Uint8Array(hexToBytes(digest)));
    signature = toRsvSignature(signed.signature);
  } finally {
    prf.fill(0);
  }
  const txHash = await postRelay("create-group", { groupId, mode: c.mode, admin, name: c.name, signature });
  return { groupId, admin, txHash };
}

/** Admin signs a single-use invite for an INVITE group. Share { inviteId, adminInviteSig } in the link. */
export async function createInvite(c: Common & { groupId: Hex }) {
  const inviteId = randomBytes32();
  const digest = digestInvite({ groupId: c.groupId, inviteId });
  const { signature } = await signAsMember(c, c.groupId, digest);
  return { inviteId, adminInviteSig: signature };
}

/** Joins a group. For INVITE groups pass the invite from createInvite. */
export async function joinGroup(
  c: Common & { groupId: Hex; invite?: { inviteId: Hex; adminInviteSig: Hex } },
) {
  const prf = await getGroupPrfOutput({ rpId: c.rpId, credential: c.credential, groupId: c.groupId });
  let member: Address;
  let signature: Hex;
  try {
    member = await memberAddressFromPrf(prf);
    const digest = digestJoin({ groupId: c.groupId, member });
    signature = toRsvSignature((await signDigestAsMember(prf, new Uint8Array(hexToBytes(digest)))).signature);
  } finally {
    prf.fill(0);
  }
  const txHash = await postRelay("join", {
    groupId: c.groupId,
    member,
    signature,
    ...(c.invite ? { inviteId: c.invite.inviteId, adminInviteSig: c.invite.adminInviteSig } : {}),
  });
  return { member, txHash };
}

/** Creates a proposal. deadlineSeconds must be between 1 and 30 days from now. */
export async function createProposal(
  c: Common & { groupId: Hex; title: string; options: string[]; deadlineSeconds: number },
) {
  const proposalId = randomBytes32();
  const prf = await getGroupPrfOutput({ rpId: c.rpId, credential: c.credential, groupId: c.groupId });
  let author: Address;
  let signature: Hex;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + c.deadlineSeconds);
  try {
    author = await memberAddressFromPrf(prf);
    const digest = digestCreateProposal({
      groupId: c.groupId,
      proposalId,
      author,
      title: c.title,
      options: c.options,
      deadline,
    });
    signature = toRsvSignature((await signDigestAsMember(prf, new Uint8Array(hexToBytes(digest)))).signature);
  } finally {
    prf.fill(0);
  }
  const txHash = await postRelay("create-proposal", {
    groupId: c.groupId,
    proposalId,
    author,
    title: c.title,
    options: c.options,
    deadline: deadline.toString(),
    signature,
  });
  return { proposalId, txHash };
}

/** Casts a final vote. Fails with AlreadyVoted or VotingClosed when the rules say so. */
export async function castVote(c: Common & { groupId: Hex; proposalId: Hex; choice: number }) {
  const prf = await getGroupPrfOutput({ rpId: c.rpId, credential: c.credential, groupId: c.groupId });
  let member: Address;
  let signature: Hex;
  try {
    member = await memberAddressFromPrf(prf);
    const digest = digestVote({ proposalId: c.proposalId, member, choice: c.choice });
    signature = toRsvSignature((await signDigestAsMember(prf, new Uint8Array(hexToBytes(digest)))).signature);
  } finally {
    prf.fill(0);
  }
  const txHash = await postRelay("vote", {
    proposalId: c.proposalId,
    member,
    choice: c.choice,
    signature,
  });
  return { member, txHash };
}

export type { RelayRoute };
