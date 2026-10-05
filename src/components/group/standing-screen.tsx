"use client";

import { Check } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Hex } from "viem";
import { useGroupPage, useProposalOptions, useStanding } from "@/data/hooks";
import { Link } from "@/i18n/navigation";
import { CredentialBadge } from "../brand/credential-badge";
import { OptionChip } from "../brand/results-list";
import { shortAddress } from "../format";
import { PasskeySetup } from "../passkey/passkey-setup";
import { ShellTitle } from "../shell/shell-title";
import { buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { LoadError } from "../ui/load-error";
import { Skeleton } from "../ui/skeleton";
import { useCredential } from "../use-credential";

/** "You voted: Pizza". The option text comes with the vote, or is looked up when only the title is known. */
function VotedOption({ proposalId, options, choice }: { proposalId: Hex; options: string[] | null; choice: number }) {
  const t = useTranslations("Standing");
  const known = useProposalOptions(proposalId, options);
  return <>{t("voted", { option: known?.[choice] ?? "—" })}</>;
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums leading-tight">{value}</dd>
    </div>
  );
}

/** My standing in one group: credential badge, votes cast, votes created. */
export function StandingScreen({ groupId }: { groupId: Hex }) {
  const t = useTranslations("Standing");
  const format = useFormatter();
  const credential = useCredential();
  const standing = useStanding(groupId);
  const page = useGroupPage(groupId);

  if (standing.status === "error") return <LoadError onRetry={standing.retry} />;
  if (standing.status !== "ready" || page.status !== "ready" || credential === undefined) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="size-28 rounded-[2rem]" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const groupName = page.data?.group.name ?? "";

  if (credential === null) {
    return (
      <div className="mx-auto max-w-xl pt-2">
        <PasskeySetup onDone={() => {}} />
      </div>
    );
  }

  if (!standing.data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 pt-8">
        <ShellTitle title={groupName} backHref={`/g/${groupId}`} />
        <h1 className="text-h2">{t("notMember")}</h1>
        <Link href={`/g/${groupId}`} className={cn(buttonVariants({ variant: "secondary" }), "mt-2")}>
          {t("toGroup")}
        </Link>
      </div>
    );
  }

  const s = standing.data;
  const date = (seconds: number) => format.dateTime(new Date(seconds * 1000), { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-10">
      <ShellTitle title={groupName} backHref={`/g/${groupId}`} />

      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <CredentialBadge address={s.address} size={112} className="rounded-[2rem]" />
        <div className="min-w-0">
          <h1 className="text-h2 !text-[clamp(1.6rem,1.2rem+1.8vw,2.4rem)]">{t("title", { group: groupName })}</h1>
          <p className="mt-2 text-muted">{t("lead")}</p>
          <p className="mt-3 break-all font-mono text-sm">{shortAddress(s.address, 10, 8)}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={t("votesCast")} value={s.votesCast.length} />
        <Tile label={t("proposalsCreated")} value={s.proposalsCreated.length} />
        <Tile label={t("joined")} value={s.joinedAt ? date(s.joinedAt) : "—"} />
      </dl>

      <section aria-labelledby="votes-title" className="flex flex-col gap-4">
        <h2 id="votes-title" className="text-h3">
          {t("historyVotes")}
        </h2>
        {s.votesCast.length === 0 ? (
          <p className="text-muted">{t("noVotes")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {s.votesCast.map((v) => (
              <li key={v.proposalId}>
                <Link
                  href={`/g/${groupId}/p/${v.proposalId}`}
                  className="surface-card flex flex-col gap-2 rounded-3xl p-5 transition-[transform,border-color] hover:border-line-strong active:scale-[0.99]"
                >
                  <span className="font-display text-lg font-semibold leading-snug">{v.title}</span>
                  <span className="flex items-center gap-2.5 text-sm text-muted">
                    <Check aria-hidden="true" className="size-4 text-success-text" strokeWidth={3} />
                    <OptionChip index={v.choice} className="size-6 text-xs" />
                    <VotedOption proposalId={v.proposalId} options={v.options} choice={v.choice} />
                    {v.votedAt ? <span className="ml-auto shrink-0">{date(v.votedAt)}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="created-title" className="flex flex-col gap-4">
        <h2 id="created-title" className="text-h3">
          {t("historyCreated")}
        </h2>
        {s.proposalsCreated.length === 0 ? (
          <p className="text-muted">{t("noCreated")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {s.proposalsCreated.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/g/${groupId}/p/${p.id}`}
                  className="surface-card flex items-center justify-between gap-3 rounded-3xl p-5 transition-[transform,border-color] hover:border-line-strong active:scale-[0.99]"
                >
                  <span className="font-display text-lg font-semibold leading-snug">{p.title}</span>
                  <span className="shrink-0 text-sm text-muted">{date(p.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-muted">{t("verify")}</p>
    </div>
  );
}
