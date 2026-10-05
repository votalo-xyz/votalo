"use client";

import { ChevronRight, LockKeyhole, Unlock, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Group, GroupMode, ProposalSummary } from "@/data/types";
import { cn } from "../ui/cn";
import { TimeLeft } from "../vote/time-left";

/** Open or invite-only, with an icon so it is not told apart by colour alone. */
export function ModeBadge({ mode, className }: { mode: GroupMode; className?: string }) {
  const t = useTranslations("Groups");
  const Icon = mode === "invite" ? LockKeyhole : Unlock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {mode === "invite" ? t("modeInvite") : t("modeOpen")}
    </span>
  );
}

export function DemoBadge() {
  const t = useTranslations("Groups");
  return (
    <span className="inline-flex rounded-full bg-identity-soft px-2.5 py-1 text-xs font-semibold text-identity">
      {t("demo")}
    </span>
  );
}

export function MemberCount({ count }: { count: number }) {
  const t = useTranslations("Groups");
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <UsersRound aria-hidden="true" className="size-4" />
      {t("members", { count })}
    </span>
  );
}

/** A group in a list: name, mode, people, and how many votes are open. */
export function GroupCard({ group, openProposals }: { group: Group; openProposals: number }) {
  const t = useTranslations("Groups");
  return (
    <Link
      href={`/g/${group.id}`}
      className="surface-card group flex items-center gap-4 rounded-3xl p-5 transition-[transform,border-color] duration-200 hover:border-line-strong active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ModeBadge mode={group.mode} />
          {group.demo && <DemoBadge />}
        </div>
        <h3 className="text-h3 mt-3 break-words">{group.name}</h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <MemberCount count={group.members} />
          <span>{t("openProposals", { count: openProposals })}</span>
        </p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1"
      />
    </Link>
  );
}

/** A vote in a list: question, time left or closed, and how many have voted. */
export function ProposalItem({ groupId, proposal, closed }: { groupId: string; proposal: ProposalSummary; closed: boolean }) {
  const t = useTranslations("GroupPage");
  const c = useTranslations("Common");
  return (
    <Link
      href={`/g/${groupId}/p/${proposal.id}`}
      className="surface-card group flex items-center gap-4 rounded-3xl p-5 transition-[transform,border-color] duration-200 hover:border-line-strong active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight break-words">{proposal.title}</h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {closed ? <span className="font-medium">{t("closedBadge")}</span> : <TimeLeft deadline={proposal.deadline} />}
          <span>{c("votes", { count: proposal.voteCount })}</span>
        </p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1"
      />
    </Link>
  );
}
