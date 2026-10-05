/**
 * Votalo event handlers. Each handler updates entities from on-chain events only — it never
 * recomputes member or vote counts independently, so the indexed state always matches what the
 * contract emitted. See docs/FRONTEND.md for the GraphQL shape this produces.
 */
import { indexer } from "envio";
import type { DailyVoteCount, Group, Member, Proposal, Vote } from "envio";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

function memberId(groupId: string, address: string): string {
  return `${groupId}-${address.toLowerCase()}`;
}

function dayId(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

indexer.onEvent({ contract: "Votalo", event: "GroupCreated" }, async ({ event, context }) => {
  const { groupId, admin, mode, name } = event.params;

  const group: Group = {
    id: groupId,
    mode: Number(mode),
    admin,
    name,
    memberCount: 1,
    createdAt: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Group.set(group);

  // createGroup also makes the admin the group's first member (contract: MemberJoined with
  // inviteId == 0 is emitted for the admin in the same transaction).
  const adminMember: Member = {
    id: memberId(groupId, admin),
    group_id: groupId,
    address: admin,
    inviteId: ZERO_HASH,
    joinedAt: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Member.set(adminMember);
});

indexer.onEvent({ contract: "Votalo", event: "MemberJoined" }, async ({ event, context }) => {
  const { groupId, member, inviteId } = event.params;

  // The admin's own MemberJoined (emitted by createGroup) is handled above, in the same tx,
  // and would overwrite nothing here since it's a different address in every real case; this
  // handler still runs for it, so skip re-creating a member that already exists with the same id.
  const id = memberId(groupId, member);
  const existing = await context.Member.get(id);
  if (existing) return;

  const row: Member = {
    id,
    group_id: groupId,
    address: member,
    inviteId,
    joinedAt: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Member.set(row);

  const group = await context.Group.get(groupId);
  if (group) {
    context.Group.set({ ...group, memberCount: group.memberCount + 1 });
  }
});

indexer.onEvent({ contract: "Votalo", event: "ProposalCreated" }, async ({ event, context }) => {
  const { groupId, proposalId, author, title, options, deadline } = event.params;

  const row: Proposal = {
    id: proposalId,
    group_id: groupId,
    author_id: memberId(groupId, author),
    title,
    options: [...options],
    deadline: BigInt(deadline),
    voteCount: 0,
    optionCounts: new Array(options.length).fill(0),
    createdAt: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Proposal.set(row);
});

indexer.onEvent({ contract: "Votalo", event: "VoteCast" }, async ({ event, context }) => {
  const { proposalId, groupId, member, choice } = event.params;
  const choiceNum = Number(choice);

  const row: Vote = {
    id: `${proposalId}-${member.toLowerCase()}`,
    proposal_id: proposalId,
    group_id: groupId,
    member_id: memberId(groupId, member),
    choice: choiceNum,
    votedAt: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Vote.set(row);

  const proposal = await context.Proposal.get(proposalId);
  if (proposal) {
    const optionCounts = [...proposal.optionCounts];
    if (choiceNum < optionCounts.length) optionCounts[choiceNum] += 1;
    context.Proposal.set({ ...proposal, voteCount: proposal.voteCount + 1, optionCounts });
  }

  const day = dayId(event.block.timestamp);
  const existing = await context.DailyVoteCount.get(day);
  const updated: DailyVoteCount = existing ? { ...existing, votes: existing.votes + 1 } : { id: day, votes: 1 };
  context.DailyVoteCount.set(updated);
});
