"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Hex } from "viem";
import { castVote, recordVote } from "@/data/actions";
import { useMemberAddress, useNowSeconds, useProposalView } from "@/data/hooks";
import { Link } from "@/i18n/navigation";
import { CredentialBadge } from "../brand/credential-badge";
import { shortAddress } from "../format";
import { JoinCard, parseInvite } from "../group/join-card";
import { PasskeySetup } from "../passkey/passkey-setup";
import { PrfUnavailable } from "../passkey/prf-unavailable";
import { ShareButton, ShareSheet } from "../share/share-sheet";
import { ShellTitle } from "../shell/shell-title";
import { buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { LoadError } from "../ui/load-error";
import { Skeleton } from "../ui/skeleton";
import { useCredential } from "../use-credential";
import { TimeLeft } from "./time-left";
import { VotePanel } from "./vote-panel";

function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 md:grid-cols-[17rem_1fr]">
        <Skeleton className="mx-auto aspect-square w-full max-w-[15rem] rounded-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** One proposal: title, time left, live ring and results, hold to vote, share. */
export function ProposalScreen({ groupId, proposalId }: { groupId: Hex; proposalId: Hex }) {
  const t = useTranslations("Proposal");
  const share = useTranslations("Share");
  const credential = useCredential();
  const view = useProposalView(groupId, proposalId);
  const member = useMemberAddress(groupId);
  const now = useNowSeconds();
  const params = useSearchParams();
  const invite = parseInvite(params);
  const [unsupported, setUnsupported] = useState(false);
  // Coming straight from creating this vote: offer to share it right away.
  const [shareOpen, setShareOpen] = useState(() => params.get("new") === "1");

  if (view.status === "error") return <LoadError onRetry={view.retry} />;
  if (view.status !== "ready" || credential === undefined || member === undefined || now === 0) {
    return <ScreenSkeleton />;
  }

  if (!view.data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 pt-8">
        <h1 className="text-h2">{t("notFoundTitle")}</h1>
        <p className="text-lead text-muted">{t("notFoundBody")}</p>
        <Link href="/groups" className={cn(buttonVariants({ variant: "secondary" }), "mt-2")}>
          {t("toGroups")}
        </Link>
      </div>
    );
  }

  const { group, proposal, myChoice } = view.data;
  const closed = now >= proposal.deadline;
  const status = closed ? "closed" : !credential ? "needsPasskey" : !member ? "notMember" : "open";
  const shownTotal = proposal.counts.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-8">
      <ShellTitle title={group.name} backHref={`/g/${groupId}`} />

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              closed ? "bg-surface-2 text-muted" : "bg-success/15 text-success-text",
            )}
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-current" />
            {closed ? t("closedBadge") : t("openBadge")}
          </span>
          {proposal.demo && (
            <span className="inline-flex rounded-full bg-identity-soft px-3 py-1 text-xs font-semibold text-identity">
              {t("demo")}
            </span>
          )}
          <TimeLeft deadline={proposal.deadline} />
        </div>
        <h1 className="text-h2 !text-[clamp(1.7rem,1.2rem+2.2vw,2.6rem)]">{proposal.title}</h1>
        <div>
          <ShareSheet
            path={`/g/${groupId}/p/${proposalId}`}
            embedPath={`/embed/p/${proposalId}`}
            text={share("proposalText", { title: proposal.title })}
            open={shareOpen}
            onOpenChange={setShareOpen}
            trigger={<ShareButton />}
          />
        </div>
      </header>

      {unsupported ? (
        <PrfUnavailable onRetry={() => setUnsupported(false)} />
      ) : (
        <>
          {status === "needsPasskey" && (
            <section className="surface-card rounded-3xl p-5 sm:p-7">
              <PasskeySetup inline onDone={() => {}} />
            </section>
          )}
          {status === "notMember" && (
            <JoinCard groupId={groupId} groupName={group.name} mode={group.mode} invite={invite} />
          )}

          <section className="surface-card rounded-4xl p-5 sm:p-8">
            <VotePanel
              options={proposal.options}
              counts={proposal.counts}
              myChoice={myChoice}
              status={status}
              onCast={async (choice) => {
                if (!credential) return;
                await castVote({ credential, groupId, proposalId, choice, deadline: proposal.deadline });
              }}
              onConfirmed={(choice) => recordVote(proposalId, choice, shownTotal)}
              onError={(key) => key === "PRF_UNAVAILABLE" && setUnsupported(true)}
            />
          </section>
        </>
      )}

      {member && (
        <footer className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4">
          <CredentialBadge address={member} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{t("yourCredential")}</p>
            <p className="mt-0.5 font-mono text-sm">{shortAddress(member, 8, 6)}</p>
          </div>
          <Link
            href={`/g/${groupId}/me`}
            className="shrink-0 text-sm font-semibold text-accent-text underline-offset-4 hover:underline"
          >
            {t("seeStanding")}
          </Link>
        </footer>
      )}
    </div>
  );
}
