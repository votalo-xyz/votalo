import type { Address, Hex } from "viem";
import type { DayVotes, Group, GroupView, Proposal, Standing } from "./types";

/**
 * Reads from the server-side data proxy (`/api/data/*`, see docs/FRONTEND.md). The browser never calls
 * the indexer: the proxy holds its address and caches each answer for a few seconds, which keeps every
 * visitor together under the indexer's query limit. Responses are the indexer's `data` object as is.
 */
export class DataFetchError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new DataFetchError(body?.error ?? "INTERNAL", res.status);
  return body;
}

/** Hasura returns BigInt columns as numbers or numeric strings depending on settings. */
const num = (value: string | number) => Number(value);

/* Row shapes: exactly the fields the proxy routes select. */

export type GroupRow = {
  name: string;
  mode: number;
  admin: string;
  memberCount: number;
  createdAt: string | number;
  proposals: { id: string; title: string; deadline: string | number; voteCount: number }[];
};

export type ProposalRow = {
  title: string;
  options: string[];
  deadline: string | number;
  voteCount: number;
  optionCounts: number[];
  group: { id: string; name: string };
};

export type MemberRow = {
  address: string;
  joinedAt: string | number;
  votesCast: { proposal: { id: string; title: string }; choice: number; votedAt: string | number }[];
  proposalsCreated: { id: string; title: string; createdAt: string | number }[];
};

export async function fetchGroup(id: string, signal?: AbortSignal): Promise<GroupRow | null> {
  return (await getJson<{ Group_by_pk: GroupRow | null }>(`/api/data/group/${id.toLowerCase()}`, signal)).Group_by_pk;
}

export async function fetchProposal(id: string, signal?: AbortSignal): Promise<ProposalRow | null> {
  return (await getJson<{ Proposal_by_pk: ProposalRow | null }>(`/api/data/proposal/${id.toLowerCase()}`, signal))
    .Proposal_by_pk;
}

/** The member id is `${groupId}-${address}` with the address in lowercase. */
export async function fetchMember(groupId: string, address: string, signal?: AbortSignal): Promise<MemberRow | null> {
  return (
    await getJson<{ Member_by_pk: MemberRow | null }>(
      `/api/data/member/${groupId.toLowerCase()}-${address.toLowerCase()}`,
      signal,
    )
  ).Member_by_pk;
}

export async function fetchVotesPerDay(signal?: AbortSignal): Promise<DayVotes[]> {
  const { DailyVoteCount } = await getJson<{ DailyVoteCount: { id: string; votes: number }[] }>(
    "/api/data/votes-per-day",
    signal,
  );
  return DailyVoteCount.map((r) => ({ day: r.id, votes: r.votes }));
}

/* Mappers from rows to what the screens use. */

export const groupFromRow = (id: string, row: GroupRow, mine: boolean): Group => ({
  id: id.toLowerCase() as Hex,
  name: row.name,
  mode: row.mode === 1 ? "invite" : "open",
  members: row.memberCount,
  mine,
  demo: false,
});

export const isAdmin = (row: GroupRow, address: Address | null) =>
  address !== null && row.admin.toLowerCase() === address.toLowerCase();

export const groupViewFromRow = (id: string, row: GroupRow, myAddress: Address | null): GroupView => ({
  group: groupFromRow(id, row, isAdmin(row, myAddress)),
  proposals: row.proposals.map((p) => ({
    id: p.id as Hex,
    title: p.title,
    deadline: num(p.deadline),
    voteCount: p.voteCount,
  })),
});

export const proposalFromRow = (id: string, row: ProposalRow): Proposal => ({
  id: id.toLowerCase() as Hex,
  groupId: row.group.id as Hex,
  title: row.title,
  options: row.options,
  counts: row.optionCounts,
  deadline: num(row.deadline),
  // The proxy does not select this; nothing on the proposal screen uses it.
  createdAt: 0,
  mine: false,
  demo: false,
});

export const standingFromRow = (row: MemberRow): Standing => ({
  address: row.address as Address,
  joinedAt: num(row.joinedAt),
  votesCast: row.votesCast.map((v) => ({
    proposalId: v.proposal.id as Hex,
    title: v.proposal.title,
    options: null,
    choice: v.choice,
    votedAt: num(v.votedAt),
  })),
  proposalsCreated: row.proposalsCreated.map((p) => ({ id: p.id as Hex, title: p.title, createdAt: num(p.createdAt) })),
});
