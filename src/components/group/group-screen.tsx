"use client";

import { IdCard, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { Hex } from "viem";
import { useGroupPage, useMemberAddress, useNowSeconds } from "@/data/hooks";
import { Link } from "@/i18n/navigation";
import { PasskeySetup } from "../passkey/passkey-setup";
import { ShellTitle } from "../shell/shell-title";
import { buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { LoadError } from "../ui/load-error";
import { Skeleton } from "../ui/skeleton";
import { useCredential } from "../use-credential";
import { InviteButton } from "./invite-button";
import { BackupStatus } from "./backup-status";
import { JoinCard, parseInvite } from "./join-card";
import { DemoBadge, MemberCount, ModeBadge, ProposalItem } from "./parts";

function GroupSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-14 w-3/4" />
      <Skeleton className="h-11 w-56 rounded-full" />
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-24 w-full rounded-3xl" />
    </div>
  );
}

export function GroupScreen({ groupId }: { groupId: Hex }) {
  const t = useTranslations("GroupPage");
  const view = useGroupPage(groupId);
  const credential = useCredential();
  const member = useMemberAddress(groupId);
  const now = useNowSeconds();
  const invite = parseInvite(useSearchParams());

  if (view.status === "error") return <LoadError onRetry={view.retry} />;
  if (view.status !== "ready" || credential === undefined || member === undefined || now === 0) {
    return <GroupSkeleton />;
  }

  if (!view.data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 pt-8">
        <h1 className="text-h2">{t("notFoundTitle")}</h1>
        <p className="text-lead text-muted">{t("notFoundBody")}</p>
        <Link href="/groups" className={cn(buttonVariants({ variant: "secondary" }), "mt-2")}>
          {t("goToGroups")}
        </Link>
      </div>
    );
  }

  const { group, proposals } = view.data;
  const open = proposals.filter((p) => p.deadline > now).sort((a, b) => a.deadline - b.deadline);
  const closed = proposals.filter((p) => p.deadline <= now).sort((a, b) => b.deadline - a.deadline);
  const isMember = !!member;
  // Open groups can be shared by anyone in them. Invite-only groups only by the person who made them.
  const canInvite = isMember && (group.mode === "open" || group.mine);

  return (
    <div className="flex flex-col gap-10">
      <ShellTitle title={group.name} backHref="/groups" />
      <BackupStatus className="-mb-6" />

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ModeBadge mode={group.mode} />
          {group.demo && <DemoBadge />}
          <MemberCount count={group.members} />
        </div>
        <h1 className="text-h2 break-words">{group.name}</h1>
        {group.demo && <p className="text-sm text-muted">{t("demoNote")}</p>}
        {group.mine && <p className="text-sm text-muted">{t("admin")}</p>}

        {isMember && (
          <div className="flex flex-wrap items-start gap-3">
            <Link href={`/g/${groupId}/new`} className={buttonVariants({ size: "sm" })}>
              <Plus aria-hidden="true" className="size-4" />
              {t("newProposal")}
            </Link>
            {canInvite && <InviteButton groupId={groupId} groupName={group.name} mode={group.mode} />}
            <Link href={`/g/${groupId}/me`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
              <IdCard aria-hidden="true" className="size-4" />
              {t("standing")}
            </Link>
          </div>
        )}
      </header>

      {!isMember &&
        (credential === null ? (
          <section className="surface-card rounded-3xl p-5 sm:p-7">
            <PasskeySetup inline onDone={() => {}} />
          </section>
        ) : (
          <JoinCard groupId={groupId} groupName={group.name} mode={group.mode} invite={invite} />
        ))}

      <section aria-labelledby="open-title" className="flex flex-col gap-4">
        <h2 id="open-title" className="text-h3">
          {t("openSection")}
        </h2>
        {open.length === 0 ? (
          <p className="text-muted">{proposals.length === 0 ? t("noProposals") : t("noOpen")}</p>
        ) : (
          <ul aria-label={t("listLabel")} className="flex flex-col gap-3">
            {open.map((p) => (
              <li key={p.id}>
                <ProposalItem groupId={groupId} proposal={p} closed={false} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section aria-labelledby="closed-title" className="flex flex-col gap-4">
          <h2 id="closed-title" className="text-h3">
            {t("closedSection")}
          </h2>
          <ul aria-label={t("listLabel")} className="flex flex-col gap-3">
            {closed.map((p) => (
              <li key={p.id}>
                <ProposalItem groupId={groupId} proposal={p} closed />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
