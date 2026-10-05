import { createPublicClient, http, type Address, type Hex } from "viem";
import { monadTestnet, VOTALO_ADDRESS } from "./config";
import { votaloAbi } from "./votaloAbi";

const client = createPublicClient({ chain: monadTestnet, transport: http(monadTestnet.rpcUrls.default.http[0]) });
const read = (functionName: string, args: readonly unknown[] = []) =>
  client.readContract({ address: VOTALO_ADDRESS, abi: votaloAbi, functionName, args } as never);

export type GroupInfo = { exists: boolean; mode: number; admin: Address; nameHash: Hex; memberCount: bigint };
export type ProposalInfo = {
  exists: boolean;
  groupId: Hex;
  deadline: bigint;
  optionCount: number;
  voteCount: bigint;
  titleHash: Hex;
  optionsHash: Hex;
  counts: bigint[];
};
export type Totals = { groups: bigint; members: bigint; proposals: bigint; votes: bigint };

export async function getGroup(groupId: Hex): Promise<GroupInfo> {
  const [exists, mode, admin, nameHash, memberCount] = (await read("groups", [groupId])) as [
    boolean,
    number,
    Address,
    Hex,
    bigint,
  ];
  return { exists, mode, admin, nameHash, memberCount };
}

export async function isMember(groupId: Hex, member: Address): Promise<boolean> {
  return (await read("isMember", [groupId, member])) as boolean;
}

export async function getProposal(proposalId: Hex): Promise<ProposalInfo> {
  const [exists, groupId, deadline, optionCount, voteCount, titleHash, optionsHash] = (await read("proposals", [
    proposalId,
  ])) as [boolean, Hex, bigint, number, bigint, Hex, Hex];
  const counts = exists ? ((await read("getCounts", [proposalId])) as bigint[]) : [];
  return { exists, groupId, deadline, optionCount, voteCount, titleHash, optionsHash, counts };
}

export async function hasVoted(proposalId: Hex, member: Address): Promise<boolean> {
  return (await read("hasVoted", [proposalId, member])) as boolean;
}

export async function getTotals(): Promise<Totals> {
  const [groups, members, proposals, votes] = await Promise.all([
    read("totalGroups"),
    read("totalMembers"),
    read("totalProposals"),
    read("totalVotes"),
  ]);
  return { groups: groups as bigint, members: members as bigint, proposals: proposals as bigint, votes: votes as bigint };
}
