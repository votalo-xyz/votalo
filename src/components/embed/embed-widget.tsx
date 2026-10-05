"use client";

import { ArrowUpRight, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchProposal, type ProposalRow } from "@/data/api";
import { useRemote } from "@/data/remote";
import { Link } from "@/i18n/navigation";
import { LivingRing } from "../brand/living-ring";
import { LogoMark } from "../brand/logo";
import { ResultsList } from "../brand/results-list";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Skeleton } from "../ui/skeleton";
import { TimeLeft } from "../vote/time-left";
import { useNowSeconds } from "@/data/hooks";

/** Same refresh as the proposal page: the data route caches for 5 s, so asking sooner would repeat an old answer. */
const POLL_MS = 6000;

const linkClass = "text-xs text-muted underline-offset-4 hover:text-fg hover:underline";

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 p-4 sm:p-5">{children}</div>;
}

/** The line at the bottom of every state. Opens the site in a new tab, never inside the frame. */
function PoweredBy() {
  const t = useTranslations("Embed");
  return (
    <p className="mt-auto pt-1 text-center">
      <Link href="/" target="_blank" rel="noopener noreferrer" className={linkClass}>
        {t("poweredBy")}
      </Link>
    </p>
  );
}

export function EmbedNotFound() {
  const t = useTranslations("Embed");
  return (
    <Frame>
      <div className="flex flex-1 flex-col items-start justify-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <SearchX aria-hidden="true" className="size-5" />
        </span>
        <h1 className="font-display text-xl font-semibold leading-tight tracking-tight">{t("notFoundTitle")}</h1>
        <p className="text-muted">{t("notFoundBody")}</p>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
        >
          {t("notFoundLink")}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <PoweredBy />
    </Frame>
  );
}

/**
 * Read-only view of one proposal for other people's websites: title, live results in the living ring, and
 * one button that opens the full page in a new tab. There is no voting here, because passkeys do not work
 * reliably inside a third-party frame. Data comes from /api/data/proposal/:id only.
 */
export function EmbedWidget({ proposalId, initial }: { proposalId: string; initial: ProposalRow | null }) {
  const t = useTranslations("Embed");
  const v = useTranslations("Vote");
  const c = useTranslations("Common");
  const now = useNowSeconds();
  const remote = useRemote(`embed:${proposalId}`, (signal) => fetchProposal(proposalId, signal), POLL_MS);

  if (remote.status === "ready" && remote.data === null) return <EmbedNotFound />;
  const row = remote.status === "ready" ? remote.data : initial;

  if (!row) {
    if (remote.status === "error") {
      return (
        <Frame>
          <div role="alert" className="flex flex-1 flex-col items-start justify-center gap-3">
            <h1 className="font-display text-xl font-semibold leading-tight tracking-tight">{t("unavailableTitle")}</h1>
            <p className="text-muted">{t("unavailableBody")}</p>
            <Button variant="secondary" size="sm" onClick={remote.retry}>
              {c("tryAgain")}
            </Button>
          </div>
          <PoweredBy />
        </Frame>
      );
    }
    return (
      <Frame>
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-6 w-1/3" />
          <div className="flex gap-4">
            <Skeleton className="size-24 shrink-0 rounded-full" />
            <Skeleton className="h-16 flex-1" />
          </div>
          <Skeleton className="h-28 w-full" />
        </div>
      </Frame>
    );
  }

  const counts = row.optionCounts;
  const total = counts.reduce((a, b) => a + b, 0);
  const deadline = Number(row.deadline);
  const closed = now > 0 && now >= deadline;

  let lead = v("noVotes");
  if (total > 0) {
    const max = Math.max(...counts);
    const leaders = counts.flatMap((n, i) => (n === max ? [i] : []));
    lead =
      leaders.length > 1
        ? v("tie")
        : v("leading", { option: row.options[leaders[0]], percent: Math.round((max / total) * 100) });
  }
  const summary = total > 0 ? v("summary", { total, lead }) : lead;

  return (
    <Frame>
      <section aria-labelledby="embed-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <LogoMark size={20} />
            <span className="font-display tracking-tight">votalo</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                closed ? "bg-surface-2 text-muted" : "bg-success/15 text-success-text",
              )}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {closed ? t("closed") : t("open")}
            </span>
            {now > 0 && <TimeLeft deadline={deadline} />}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <LivingRing counts={counts} label={v("ringLabel", { summary })} className="w-24 shrink-0 sm:w-28">
            <span className="font-display text-2xl font-extrabold leading-none tabular-nums sm:text-3xl">{total}</span>
            <span className="mt-0.5 text-[0.7rem] text-muted">{v("votesWord", { count: total })}</span>
          </LivingRing>
          <h1 id="embed-title" className="min-w-0 break-words font-display text-lg font-semibold leading-snug tracking-tight sm:text-xl">
            {row.title}
          </h1>
        </div>

        <ResultsList options={row.options} counts={counts} />
      </section>

      <div>
        <Link
          href={`/g/${row.group.id}/p/${proposalId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "md" }), "w-full")}
        >
          {t("vote")}
          <ArrowUpRight aria-hidden="true" className="size-5" />
          <span className="sr-only"> ({t("voteHint")})</span>
        </Link>
      </div>
      <PoweredBy />
    </Frame>
  );
}
