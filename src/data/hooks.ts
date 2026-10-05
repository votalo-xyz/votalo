"use client";

import { useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import type { Address, Hex } from "viem";
import { isLive } from "./config";
import { buildDemo, type DemoTexts } from "./demo";
import {
  GROUP_QUERY,
  GROUPS_BY_IDS_QUERY,
  MEMBER_QUERY,
  PROPOSAL_QUERY,
  VOTES_PER_DAY_QUERY,
  daysFromRows,
  gql,
  groupFromRow,
  groupViewFromRow,
  proposalFromRow,
  standingFromRow,
  type GroupRow,
  type MemberRow,
  type ProposalRow,
} from "./graphql";
import { useRemote, type Remote } from "./remote";
import { useStore, type StoreState } from "./store";
import type { DayVotes, Group, GroupView, Proposal, ProposalSummary, Standing } from "./types";

/* ------------------------------------------------------------------ clock */

const tickListeners = new Set<() => void>();
let tickTimer: number | undefined;
let nowCache = 0;

function subscribeTick(onChange: () => void) {
  tickListeners.add(onChange);
  if (tickTimer === undefined) {
    tickTimer = window.setInterval(() => {
      nowCache = Math.floor(Date.now() / 1000);
      tickListeners.forEach((l) => l());
    }, 15_000);
  }
  return () => {
    tickListeners.delete(onChange);
    if (tickListeners.size === 0 && tickTimer !== undefined) {
      window.clearInterval(tickTimer);
      tickTimer = undefined;
    }
  };
}

/** Unix seconds, refreshed every 15 s. `0` on the server and on the first render, so callers show a placeholder. */
export function useNowSeconds(): number {
  return useSyncExternalStore(
    subscribeTick,
    () => (nowCache === 0 ? (nowCache = Math.floor(Date.now() / 1000)) : nowCache),
    () => 0,
  );
}

/* ------------------------------------------------------------ small pieces */

const lower = (id: string) => id.toLowerCase() as Hex;
const total = (counts: number[]) => counts.reduce((a, b) => a + b, 0);
const ready = <T>(data: T): Remote<T> => ({ status: "ready", data });
const loading: Remote<never> = { status: "loading" };

/** The example group, in the current language. Only in local mode: with a live indexer there is no example. */
function useDemo() {
  const t = useTranslations("DemoData");
  const now = useNowSeconds();
  const day = Math.floor(now / 86_400);
  return useMemo(() => {
    if (isLive || day === 0) return null;
    const texts: DemoTexts = {
      group: t("group"),
      open: { title: t("open.title"), options: t.raw("open.options") as string[] },
      closed: { title: t("closed.title"), options: t.raw("closed.options") as string[] },
    };
    return buildDemo(texts, day * 86_400);
  }, [t, day]);
}

type Vote = StoreState["votes"][Hex];

/** Counts this member's own vote until the shown total passes the total at the moment they voted. */
function withMyVote(proposal: Proposal, vote: Vote | undefined): Proposal {
  if (!vote || total(proposal.counts) > vote.baseline) return proposal;
  return { ...proposal, counts: proposal.counts.map((n, i) => (i === vote.choice ? n + 1 : n)) };
}

function summarize(p: Proposal, vote: Vote | undefined): ProposalSummary {
  const counted = withMyVote(p, vote);
  return { id: p.id, title: p.title, deadline: p.deadline, voteCount: total(counted.counts) };
}

/** Local proposals (created here, and the example ones), as a flat list. */
function localProposals(store: StoreState, demo: ReturnType<typeof useDemo>): Proposal[] {
  return [...store.proposals, ...(demo?.proposals ?? [])];
}

function localGroupView(store: StoreState, demo: ReturnType<typeof useDemo>, group: Group): GroupView {
  const joinedDemo = group.demo && store.members[group.id] ? 1 : 0;
  return {
    group: { ...group, members: group.members + joinedDemo },
    proposals: localProposals(store, demo)
      .filter((p) => p.groupId === group.id)
      .map((p) => summarize(p, store.votes[p.id]))
      .sort((a, b) => b.deadline - a.deadline),
  };
}

function localGroups(store: StoreState, demo: ReturnType<typeof useDemo>): Group[] {
  return [...store.groups, ...(demo ? [demo.group] : [])];
}

/** Adds proposals created in this browser that the indexer has not returned yet. */
function mergePending(remote: ProposalSummary[], store: StoreState, groupId: Hex): ProposalSummary[] {
  const known = new Set(remote.map((p) => p.id));
  const pending = store.proposals
    .filter((p) => p.groupId === groupId && !known.has(p.id))
    .map((p) => summarize(p, store.votes[p.id]));
  return [...pending, ...remote.map((p) => ({ ...p, voteCount: bumped(p, store.votes[p.id]) }))];
}

function bumped(p: ProposalSummary, vote: Vote | undefined) {
  return vote && p.voteCount <= vote.baseline ? p.voteCount + 1 : p.voteCount;
}

/* ------------------------------------------------------------------ hooks */

/** Member address in one group, from a past passkey prompt in this browser. `undefined` while loading. */
export function useMemberAddress(groupId: Hex): Address | null | undefined {
  const store = useStore();
  if (!store) return undefined;
  return store.members[lower(groupId)]?.address ?? null;
}

/** Groups this browser belongs to, with their proposals. */
export function useMyGroups(): Remote<GroupView[]> {
  const store = useStore();
  const demo = useDemo();
  const ids = useMemo(
    () => (store ? [...new Set([...Object.keys(store.members), ...store.groups.map((g) => g.id)])] : []),
    [store],
  );
  const remote = useRemote<GroupRow[]>(
    isLive && ids.length > 0 ? `groups:${ids.join(",")}` : null,
    async (signal) => (await gql<{ Group: GroupRow[] }>(GROUPS_BY_IDS_QUERY, { ids }, signal)).Group,
    6000,
  );

  return useMemo(() => {
    if (!store) return loading;
    if (!isLive) {
      if (!demo) return loading;
      return ready(localGroups(store, demo).map((g) => localGroupView(store, demo, g)));
    }
    if (ids.length === 0) return ready([]);
    if (remote.status === "error") return remote;
    if (remote.status !== "ready") return loading;
    const returned = new Set(remote.data.map((g) => g.id));
    const views = remote.data.map((row) => {
      const view = groupViewFromRow(row, store.members[row.id as Hex]?.address ?? null);
      return { ...view, proposals: mergePending(view.proposals, store, row.id as Hex) };
    });
    // Groups created here that the indexer has not picked up yet.
    const pending = store.groups.filter((g) => !returned.has(g.id)).map((g) => localGroupView(store, null, g));
    return ready([...pending, ...views]);
  }, [store, demo, ids, remote]);
}

/** One group: details and proposals. `data: null` means no such group. */
export function useGroupPage(groupIdParam: Hex): Remote<GroupView | null> {
  const groupId = lower(groupIdParam);
  const store = useStore();
  const demo = useDemo();
  const remote = useRemote<GroupRow | null>(
    isLive ? `group:${groupId}` : null,
    async (signal) => (await gql<{ Group_by_pk: GroupRow | null }>(GROUP_QUERY, { id: groupId }, signal)).Group_by_pk,
    5000,
  );

  return useMemo(() => {
    if (!store) return loading;
    const localGroup = localGroups(store, demo).find((g) => g.id === groupId);
    if (!isLive) {
      if (!demo) return loading;
      return ready(localGroup ? localGroupView(store, demo, localGroup) : null);
    }
    if (remote.status === "error") return remote;
    if (remote.status !== "ready") return loading;
    if (remote.data) {
      const view = groupViewFromRow(remote.data, store.members[groupId]?.address ?? null);
      return ready({ ...view, proposals: mergePending(view.proposals, store, groupId) });
    }
    return ready(localGroup ? localGroupView(store, null, localGroup) : null);
  }, [store, demo, groupId, remote]);
}

/** Pulls this member's row from the indexer (votes cast, proposals created). */
function useMemberRow(groupId: Hex, address: Address | null | undefined) {
  return useRemote<MemberRow | null>(
    isLive && address ? `member:${groupId}:${address.toLowerCase()}` : null,
    async (signal) =>
      (await gql<{ Member_by_pk: MemberRow | null }>(MEMBER_QUERY, { id: `${groupId}-${address!.toLowerCase()}` }, signal))
        .Member_by_pk,
    6000,
  );
}

export type ProposalView = { group: Group; proposal: Proposal; myChoice: number | null };

/** One proposal with live results and this member's own vote. `data: null` means no such proposal. */
export function useProposalView(groupIdParam: Hex, proposalIdParam: Hex): Remote<ProposalView | null> {
  const groupId = lower(groupIdParam);
  const proposalId = lower(proposalIdParam);
  const store = useStore();
  const demo = useDemo();
  const address = useMemberAddress(groupId);
  const remote = useRemote<ProposalRow | null>(
    isLive ? `proposal:${proposalId}` : null,
    async (signal) =>
      (await gql<{ Proposal_by_pk: ProposalRow | null }>(PROPOSAL_QUERY, { id: proposalId }, signal)).Proposal_by_pk,
    4000,
  );
  const member = useMemberRow(groupId, address);

  return useMemo(() => {
    if (!store) return loading;
    const localProposal = localProposals(store, demo).find((p) => p.id === proposalId && p.groupId === groupId);
    const localGroup = localGroups(store, demo).find((g) => g.id === groupId);
    const mine = store.votes[proposalId];

    let proposal: Proposal | null;
    let group: Group | null;
    if (!isLive) {
      if (!demo) return loading;
      proposal = localProposal ?? null;
      group = localGroup ? { ...localGroup, members: localGroup.members + (localGroup.demo && store.members[groupId] ? 1 : 0) } : null;
    } else {
      if (remote.status === "error") return remote;
      if (remote.status !== "ready") return loading;
      if (remote.data && lower(remote.data.group.id) === groupId) {
        proposal = proposalFromRow(remote.data);
        group = groupFromRow(
          remote.data.group,
          !!address && remote.data.group.admin.toLowerCase() === address.toLowerCase(),
        );
      } else {
        // Just created here and not indexed yet.
        proposal = localProposal ?? null;
        group = localGroup ?? null;
      }
    }
    if (!proposal || !group) return ready(null);

    // This member's choice: from this browser, or from the indexer when they voted on another device.
    const fromIndexer =
      member.status === "ready" && member.data
        ? member.data.votesCast.find((v) => lower(v.proposal.id) === proposalId)?.choice
        : undefined;
    const myChoice = mine?.choice ?? fromIndexer ?? null;
    return ready({ group, proposal: withMyVote(proposal, mine), myChoice });
  }, [store, demo, groupId, proposalId, remote, member, address]);
}

/** This member's standing inside one group. `data: null` when they are not a member (no address known here). */
export function useStanding(groupIdParam: Hex): Remote<Standing | null> {
  const groupId = lower(groupIdParam);
  const store = useStore();
  const demo = useDemo();
  const address = useMemberAddress(groupId);
  const remote = useMemberRow(groupId, address);

  return useMemo(() => {
    if (!store || address === undefined) return loading;
    if (!address) return ready(null);
    if (isLive && remote.status === "error") return remote;
    if (isLive && remote.status !== "ready") return loading;
    if (!isLive && !demo) return loading;
    const row = remote.status === "ready" ? remote.data : null;

    const proposals = localProposals(store, demo);
    const localVotes: Standing["votesCast"] = Object.entries(store.votes).flatMap(([id, v]) => {
      const p = proposals.find((x) => x.id === id && x.groupId === groupId);
      return p ? [{ proposalId: p.id, title: p.title, options: p.options, choice: v.choice, votedAt: null }] : [];
    });
    const localCreated: Standing["proposalsCreated"] = store.proposals
      .filter((p) => p.groupId === groupId && p.mine)
      .map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt }));
    const joinedAt = store.members[groupId]?.joinedAt ?? null;

    if (!row) return ready({ address, joinedAt, votesCast: localVotes, proposalsCreated: localCreated });
    const indexed = standingFromRow(row);
    const votedIds = new Set(indexed.votesCast.map((v) => lower(v.proposalId)));
    const createdIds = new Set(indexed.proposalsCreated.map((p) => lower(p.id)));
    return ready({
      ...indexed,
      votesCast: [...localVotes.filter((v) => !votedIds.has(lower(v.proposalId))), ...indexed.votesCast],
      proposalsCreated: [...localCreated.filter((p) => !createdIds.has(lower(p.id))), ...indexed.proposalsCreated],
    });
  }, [store, demo, groupId, address, remote]);
}

/** Votes per UTC day, from the indexer. `unavailable` until an endpoint is configured. */
export function useVotesPerDay(): Remote<DayVotes[]> {
  const remote = useRemote<DayVotes[]>(
    isLive ? "votes-per-day" : null,
    async (signal) =>
      daysFromRows((await gql<{ DailyVoteCount: { id: string; votes: number }[] }>(VOTES_PER_DAY_QUERY, {}, signal)).DailyVoteCount),
    30_000,
  );
  return remote;
}
