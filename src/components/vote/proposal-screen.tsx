"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Hex } from "viem";
import { CredentialBadge } from "../brand/credential-badge";
import { classifyError, type ErrorKey } from "../errors";
import { PasskeySetup } from "../passkey/passkey-setup";
import { PrfUnavailable } from "../passkey/prf-unavailable";
import { ShareButton, ShareSheet } from "../share/share-sheet";
import { ShellTitle } from "../shell/shell-title";
import { shortAddress } from "../format";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Skeleton } from "../ui/skeleton";
import { useCredential } from "../use-credential";
import { castVote, joinGroup, recordVote } from "@/data/actions";
import { useCatalog, useNowSeconds } from "@/data/hooks";
import { Link } from "@/i18n/navigation";
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

function JoinCard({ groupName, groupId }: { groupName: string; groupId: Hex }) {
  const t = useTranslations("Proposal");
  const e = useTranslations("Errors");
  const credential = useCredential();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function join() {
    if (!credential) return;
    setBusy(true);
    setError(null);
    try {
      await joinGroup({ credential, groupId });
    } catch (err) {
      setError(classifyError(err));
      setBusy(false);
    }
  }

  if (error === "PRF_UNAVAILABLE") return <PrfUnavailable onRetry={() => setError(null)} />;

  return (
    <section className="surface-card rounded-3xl p-5 sm:p-6">
      <h2 className="text-h3">{t("joinTitle", { group: groupName })}</h2>
      <p className="mt-2 text-muted">{t("joinBody")}</p>
      <Button onClick={join} disabled={busy} className="mt-5 w-full sm:w-auto">
        {busy ? t("joining") : t("joinButton")}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {e(error)}
        </p>
      )}
    </section>
  );
}

/** One proposal: title, time left, live ring and results, hold to vote, share. */
export function ProposalScreen({ groupId, proposalId }: { groupId: Hex; proposalId: Hex }) {
  const t = useTranslations("Proposal");
  const share = useTranslations("Share");
  const credential = useCredential();
  const catalog = useCatalog();
  const now = useNowSeconds();
  const [unsupported, setUnsupported] = useState(false);

  if (!catalog || credential === undefined) return <ScreenSkeleton />;

  const proposal = catalog.proposals.find((p) => p.id === proposalId && p.groupId === groupId);
  const group = catalog.groups.find((g) => g.id === groupId);

  if (!proposal || !group) {
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

  const member = catalog.memberOf(groupId);
  const closed = now >= proposal.deadline;
  const mine = catalog.myChoice(proposalId);
  const status = closed ? "closed" : !credential ? "needsPasskey" : !member ? "notMember" : "open";

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
            text={share("proposalText", { title: proposal.title })}
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
          {status === "notMember" && <JoinCard groupName={group.name} groupId={groupId} />}

          <section className="surface-card rounded-4xl p-5 sm:p-8">
            <VotePanel
              options={proposal.options}
              counts={proposal.counts}
              myChoice={mine}
              status={status}
              onCast={async (choice) => {
                if (!credential) return;
                await castVote({ credential, groupId, proposalId, choice, deadline: proposal.deadline });
              }}
              onConfirmed={(choice) => recordVote(proposalId, choice)}
              onError={(key) => key === "PRF_UNAVAILABLE" && setUnsupported(true)}
            />
          </section>
        </>
      )}

      {member && (
        <footer className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4">
          <CredentialBadge address={member} size={56} />
          <div className="min-w-0">
            <p className="text-sm text-muted">{t("yourCredential")}</p>
            <p className="mt-0.5 font-mono text-sm">{shortAddress(member, 8, 6)}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
