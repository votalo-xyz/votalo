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

export type MemberStanding = {
  address: Address;
  votesCast: number;
  proposalsCreated: number;
  joinedAt: number | null;
};
