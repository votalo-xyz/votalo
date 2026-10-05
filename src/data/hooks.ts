"use client";

import { useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import type { Address, Hex } from "viem";
import {
  fetchGroup,
  fetchMember,
  fetchProposal,
  fetchVotesPerDay,
  groupFromRow,
  groupViewFromRow,
  isAdmin,
  proposalFromRow,
  standingFromRow,
} from "./api";
import { buildDemo, type DemoTexts } from "./demo";
import { retryDataMode, useDataMode, type DataMode } from "./mode";
import { useRemote, type Remote } from "./remote";
import { useStore, type StoreState } from "./store";
import type { DayVotes, Group, GroupView, Proposal, ProposalSummary, Standing } from "./types";

/** How often each kind of data is refreshed while its screen is open and the tab is visible. */
const POLL = { groups: 15_000, group: 10_000, proposal: 6_000, member: 12_000, days: 30_000 } as const;

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

/** What to show before the server has said whether an indexer is configured (or if asking failed). */
function modeGate(mode: DataMode | "error" | undefined): Remote<never> | null {
  if (mode === undefined) return loading;
  if (mode === "error") return { status: "error", retry: retryDataMode };
  return null;
}

/** The example group, in the current language. Only in local mode: with an indexer there is no example. */
function useDemo(mode: DataMode | "error" | undefined) {
  const t = useTranslations("DemoData");
  const now = useNowSeconds();
  const day = Math.floor(now / 86_400);
  return useMemo(() => {
    if (mode !== "local" || day === 0) return null;
    const texts: DemoTexts = {
      group: t("group"),
      open: { title: t("open.title"), options: t.raw("open.options") as string[] },
      closed: { title: t("closed.title"), options: t.raw("closed.options") as string[] },
    };
    return buildDemo(texts, day * 86_400);
  }, [t, day, mode]);
}

type Demo = ReturnType<typeof useDemo>;
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
function localProposals(store: StoreState, demo: Demo): Proposal[] {
  return [...store.proposals, ...(demo?.proposals ?? [])];
}

function localGroupView(store: StoreState, demo: Demo, group: Group): GroupView {
  const joinedDemo = group.demo && store.members[group.id] ? 1 : 0;
  return {
    group: { ...group, members: group.members + joinedDemo },
    proposals: localProposals(store, demo)
      .filter((p) => p.groupId === group.id)
      .map((p) => summarize(p, store.votes[p.id]))
      .sort((a, b) => b.deadline - a.deadline),
  };
}

function localGroups(store: StoreState, demo: Demo): Group[] {
  return [...store.groups, ...(demo ? [demo.group] : [])];
}

function bumped(p: ProposalSummary, vote: Vote | undefined) {
  return vote && p.voteCount <= vote.baseline ? p.voteCount + 1 : p.voteCount;
}

/** Adds proposals created in this browser that the indexer has not returned yet. */
function mergePending(remote: ProposalSummary[], store: StoreState, groupId: Hex): ProposalSummary[] {
  const known = new Set(remote.map((p) => p.id));
  const pending = store.proposals
    .filter((p) => p.groupId === groupId && !known.has(p.id))
    .map((p) => summarize(p, store.votes[p.id]));
  return [...pending, ...remote.map((p) => ({ ...p, voteCount: bumped(p, store.votes[p.id]) }))];
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
  const mode = useDataMode();
  const live = mode === "live";
  const store = useStore();
  const demo = useDemo(mode);
  const ids = useMemo(
    () => (store ? [...new Set([...Object.keys(store.members), ...store.groups.map((g) => g.id)])] : []),
    [store],
  );
  // One proxied request per group; the proxy caches each for 10 s.
  const remote = useRemote(
    live && ids.length > 0 ? `groups:${ids.join(",")}` : null,
    (signal) => Promise.all(ids.map(async (id) => ({ id, row: await fetchGroup(id, signal) }))),
    POLL.groups,
  );

  return useMemo(() => {
    const gate = modeGate(mode);
    if (gate) return gate;
    if (!store) return loading;
    if (!live) {
      if (!demo) return loading;
      return ready(localGroups(store, demo).map((g) => localGroupView(store, demo, g)));
    }
    if (ids.length === 0) return ready([]);
    if (remote.status === "error") return remote;
    if (remote.status !== "ready") return loading;
    const views = remote.data.flatMap(({ id, row }) => {
      if (!row) return [];
      const view = groupViewFromRow(id, row, store.members[id as Hex]?.address ?? null);
      return [{ ...view, proposals: mergePending(view.proposals, store, lower(id)) }];
    });
    const returned = new Set(views.map((v) => v.group.id));
    // Groups created here that the indexer has not picked up yet.
    const pending = store.groups.filter((g) => !returned.has(g.id)).map((g) => localGroupView(store, null, g));
    return ready([...pending, ...views]);
  }, [mode, live, store, demo, ids, remote]);
}

/** One group: details and proposals. `data: null` means no such group. */
export function useGroupPage(groupIdParam: Hex): Remote<GroupView | null> {
  const groupId = lower(groupIdParam);
  const mode = useDataMode();
  const live = mode === "live";
  const store = useStore();
  const demo = useDemo(mode);
  const remote = useRemote(live ? `group:${groupId}` : null, (signal) => fetchGroup(groupId, signal), POLL.group);

  return useMemo(() => {
    const gate = modeGate(mode);
    if (gate) return gate;
    if (!store) return loading;
    const localGroup = localGroups(store, demo).find((g) => g.id === groupId);
    if (!live) {
      if (!demo) return loading;
      return ready(localGroup ? localGroupView(store, demo, localGroup) : null);
    }
    if (remote.status === "error") return remote;
    if (remote.status !== "ready") return loading;
    if (remote.data) {
      const view = groupViewFromRow(groupId, remote.data, store.members[groupId]?.address ?? null);
      return ready({ ...view, proposals: mergePending(view.proposals, store, groupId) });
    }
    // Just created here and not indexed yet.
    return ready(localGroup ? localGroupView(store, null, localGroup) : null);
  }, [mode, live, store, demo, groupId, remote]);
}

/** Pulls this member's row (votes cast, proposals created) through the proxy. */
function useMemberRow(groupId: Hex, address: Address | null | undefined, live: boolean) {
  return useRemote(
    live && address ? `member:${groupId}:${address.toLowerCase()}` : null,
    (signal) => fetchMember(groupId, address!, signal),
    POLL.member,
  );
}

export type ProposalView = { group: Group; proposal: Proposal; myChoice: number | null };

/** One proposal with live results and this member's own vote. `data: null` means no such proposal. */
export function useProposalView(groupIdParam: Hex, proposalIdParam: Hex): Remote<ProposalView | null> {
  const groupId = lower(groupIdParam);
  const proposalId = lower(proposalIdParam);
  const mode = useDataMode();
  const live = mode === "live";
  const store = useStore();
  const demo = useDemo(mode);
  const address = useMemberAddress(groupId);
  const remote = useRemote(live ? `proposal:${proposalId}` : null, (signal) => fetchProposal(proposalId, signal), POLL.proposal);
  // The proposal route does not carry the group's mode or admin, so the group comes from its own route.
  const groupRemote = useRemote(live ? `group:${groupId}` : null, (signal) => fetchGroup(groupId, signal), POLL.group);
  const member = useMemberRow(groupId, address, live);

  return useMemo(() => {
    const gate = modeGate(mode);
    if (gate) return gate;
    if (!store) return loading;
    const localProposal = localProposals(store, demo).find((p) => p.id === proposalId && p.groupId === groupId);
    const localGroup = localGroups(store, demo).find((g) => g.id === groupId);
    const mine = store.votes[proposalId];

    let proposal: Proposal | null;
    let group: Group | null;
    if (!live) {
      if (!demo) return loading;
      proposal = localProposal ?? null;
      group = localGroup
        ? { ...localGroup, members: localGroup.members + (localGroup.demo && store.members[groupId] ? 1 : 0) }
        : null;
    } else {
      if (remote.status === "error") return remote;
      if (groupRemote.status === "error") return groupRemote;
      if (remote.status !== "ready" || groupRemote.status !== "ready") return loading;
      if (remote.data && lower(remote.data.group.id) === groupId) {
        proposal = proposalFromRow(proposalId, remote.data);
        group = groupRemote.data
          ? groupFromRow(groupId, groupRemote.data, isAdmin(groupRemote.data, address ?? null))
          : { id: groupId, name: remote.data.group.name, mode: "open", members: 0, mine: false, demo: false };
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
  }, [mode, live, store, demo, groupId, proposalId, remote, groupRemote, member, address]);
}

/** This member's standing inside one group. `data: null` when they are not a member (no address known here). */
export function useStanding(groupIdParam: Hex): Remote<Standing | null> {
  const groupId = lower(groupIdParam);
  const mode = useDataMode();
  const live = mode === "live";
  const store = useStore();
  const demo = useDemo(mode);
  const address = useMemberAddress(groupId);
  const remote = useMemberRow(groupId, address, live);

  return useMemo(() => {
    const gate = modeGate(mode);
    if (gate) return gate;
    if (!store || address === undefined) return loading;
    if (!address) return ready(null);
    if (live && remote.status === "error") return remote;
    if (live && remote.status !== "ready") return loading;
    if (!live && !demo) return loading;
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
  }, [mode, live, store, demo, groupId, address, remote]);
}

/**
 * The option texts of a proposal. The member route only returns titles, so when a vote in the history
 * has no options yet, they are looked up through the proposal route (cached by the proxy for a few seconds).
 */
export function useProposalOptions(proposalId: Hex, known: string[] | null): string[] | null {
  const mode = useDataMode();
  const id = lower(proposalId);
  const remote = useRemote(
    mode === "live" && !known ? `options:${id}` : null,
    (signal) => fetchProposal(id, signal),
    0,
  );
  if (known) return known;
  return remote.status === "ready" && remote.data ? remote.data.options : null;
}

/** Votes per UTC day, through the proxy. `unavailable` when no indexer is configured. */
export function useVotesPerDay(): Remote<DayVotes[]> {
  const mode = useDataMode();
  const remote = useRemote(mode === "live" ? "votes-per-day" : null, (signal) => fetchVotesPerDay(signal), POLL.days);
  return modeGate(mode) ?? remote;
}
