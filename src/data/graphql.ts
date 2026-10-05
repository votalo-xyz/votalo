import type { Address, Hex } from "viem";
import { GRAPHQL_URL } from "./config";
import type { DayVotes, Group, GroupView, Proposal, Standing } from "./types";

/** Minimal GraphQL POST. Throws on HTTP errors and on GraphQL `errors`. */
export async function gql<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) throw new Error(`graphql ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!body.data) throw new Error("graphql empty");
  return body.data;
}

/*
 * Queries follow docs/FRONTEND.md. The ones for a list of groups, and the extra fields on the proposal
 * and member queries (options, createdAt, group mode), only select fields that exist in
 * indexer/schema.graphql.
 */

export const GROUP_QUERY = /* GraphQL */ `
  query Group($id: String!) {
    Group_by_pk(id: $id) {
      id
      name
      mode
      admin
      memberCount
      createdAt
      proposals(order_by: { createdAt: desc }) {
        id
        title
        deadline
        voteCount
      }
    }
  }
`;

export const GROUPS_BY_IDS_QUERY = /* GraphQL */ `
  query Groups($ids: [String!]!) {
    Group(where: { id: { _in: $ids } }) {
      id
      name
      mode
      admin
      memberCount
      createdAt
      proposals(order_by: { createdAt: desc }) {
        id
        title
        deadline
        voteCount
      }
    }
  }
`;

export const PROPOSAL_QUERY = /* GraphQL */ `
  query Proposal($id: String!) {
    Proposal_by_pk(id: $id) {
      id
      title
      options
      deadline
      voteCount
      optionCounts
      createdAt
      group {
        id
        name
        mode
        admin
        memberCount
        createdAt
      }
    }
  }
`;

export const MEMBER_QUERY = /* GraphQL */ `
  query MemberProfile($id: String!) {
    Member_by_pk(id: $id) {
      address
      joinedAt
      votesCast {
        proposal {
          id
          title
          options
        }
        choice
        votedAt
      }
      proposalsCreated {
        id
        title
        createdAt
      }
    }
  }
`;

export const VOTES_PER_DAY_QUERY = /* GraphQL */ `
  query VotesPerDay {
    DailyVoteCount(order_by: { id: asc }) {
      id
      votes
    }
  }
`;

/** Hasura returns BigInt columns as numbers or numeric strings depending on settings. */
const num = (value: string | number) => Number(value);

type GroupRow = {
  id: string;
  name: string;
  mode: number;
  admin: string;
  memberCount: number;
  createdAt: string | number;
  proposals?: { id: string; title: string; deadline: string | number; voteCount: number }[];
};

export const groupFromRow = (row: GroupRow, mine: boolean): Group => ({
  id: row.id as Hex,
  name: row.name,
  mode: row.mode === 1 ? "invite" : "open",
  members: row.memberCount,
  mine,
  demo: false,
});

export const groupViewFromRow = (row: GroupRow, myAddress: Address | null): GroupView => ({
  group: groupFromRow(row, myAddress !== null && row.admin.toLowerCase() === myAddress.toLowerCase()),
  proposals: (row.proposals ?? []).map((p) => ({
    id: p.id as Hex,
    title: p.title,
    deadline: num(p.deadline),
    voteCount: p.voteCount,
  })),
});

type ProposalRow = {
  id: string;
  title: string;
  options: string[];
  deadline: string | number;
  voteCount: number;
  optionCounts: number[];
  createdAt: string | number;
  group: GroupRow;
};

export const proposalFromRow = (row: ProposalRow): Proposal => ({
  id: row.id as Hex,
  groupId: row.group.id as Hex,
  title: row.title,
  options: row.options,
  counts: row.optionCounts,
  deadline: num(row.deadline),
  createdAt: num(row.createdAt),
  mine: false,
  demo: false,
});

type MemberRow = {
  address: string;
  joinedAt: string | number;
  votesCast: { proposal: { id: string; title: string; options: string[] }; choice: number; votedAt: string | number }[];
  proposalsCreated: { id: string; title: string; createdAt: string | number }[];
};

export const standingFromRow = (row: MemberRow): Standing => ({
  address: row.address as Address,
  joinedAt: num(row.joinedAt),
  votesCast: row.votesCast.map((v) => ({
    proposalId: v.proposal.id as Hex,
    title: v.proposal.title,
    options: v.proposal.options,
    choice: v.choice,
    votedAt: num(v.votedAt),
  })),
  proposalsCreated: row.proposalsCreated.map((p) => ({ id: p.id as Hex, title: p.title, createdAt: num(p.createdAt) })),
});

export const daysFromRows = (rows: { id: string; votes: number }[]): DayVotes[] =>
  rows.map((r) => ({ day: r.id, votes: r.votes }));

export type { GroupRow, MemberRow, ProposalRow };
