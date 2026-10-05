import type { Address, Hex } from "viem";

/** Shapes the screens read. They follow docs/FRONTEND.md; the GraphQL layer fills them in later. */
export type GroupMode = "open" | "invite";

export type Group = {
  id: Hex;
  name: string;
  mode: GroupMode;
  members: number;
  /** Created in this browser, so this member is its admin. */
  mine: boolean;
  /** Example content that ships with the app. Labelled as an example in the UI. */
  demo: boolean;
};

/** What a list needs to show a proposal. */
export type ProposalSummary = {
  id: Hex;
  title: string;
  deadline: number;
  voteCount: number;
};

export type Proposal = {
  id: Hex;
  groupId: Hex;
  title: string;
  options: string[];
  counts: number[];
  /** Unix seconds. Voting closes at this moment. */
  deadline: number;
  createdAt: number;
  mine: boolean;
  demo: boolean;
};

export type GroupView = { group: Group; proposals: ProposalSummary[] };

export type Standing = {
  address: Address;
  joinedAt: number | null;
  /** `options` is null when only the title is known; the screen then looks the options up. */
  votesCast: { proposalId: Hex; title: string; options: string[] | null; choice: number; votedAt: number | null }[];
  proposalsCreated: { id: Hex; title: string; createdAt: number }[];
};

export type DayVotes = { day: string; votes: number };
