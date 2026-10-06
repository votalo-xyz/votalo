"use client";

import { Plus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useMyGroups, useNowSeconds } from "@/data/hooks";
import { useStore } from "@/data/store";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { LoadError } from "../ui/load-error";
import { Skeleton } from "../ui/skeleton";
import { GroupCard } from "./parts";
import { RestoreGroups } from "./restore-groups";

export function GroupsScreen() {
  const t = useTranslations("Groups");
  const groups = useMyGroups();
  const now = useNowSeconds();
  const store = useStore();
  // Nothing of mine on this device: a new device, or cleared site data. The list may be saved for my passkey.
  const nothingHere = !!store && Object.keys(store.members).length === 0 && store.groups.length === 0;
  // Once a restore has run here, keep its block on screen: its message says what came back.
  const [restoredHere, setRestoredHere] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-md">
          <h1 className="text-h2">{t("title")}</h1>
          <p className="mt-3 text-muted">{t("lead")}</p>
        </div>
        <Link href="/create" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
          <Plus aria-hidden="true" className="size-4" />
          {t("create")}
        </Link>
      </header>

      {groups.status === "error" ? (
        <LoadError onRetry={groups.retry} />
      ) : groups.status !== "ready" || now === 0 ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      ) : groups.data.length === 0 ? (
        <div className="surface-card flex flex-col items-start gap-4 rounded-4xl p-7 sm:p-9">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-identity-soft text-identity">
            <UsersRound aria-hidden="true" className="size-7" />
          </span>
          <h2 className="text-h3">{t("emptyTitle")}</h2>
          <p className="text-muted">{t("emptyBody")}</p>
          <Link href="/create" className={buttonVariants()}>
            {t("create")}
          </Link>
        </div>
      ) : (
        <ul aria-label={t("listLabel")} className="flex flex-col gap-3">
          {groups.data.map(({ group, proposals }) => (
            <li key={group.id}>
              <GroupCard group={group} openProposals={proposals.filter((p) => p.deadline > now).length} />
            </li>
          ))}
        </ul>
      )}

      {(nothingHere || restoredHere) && <RestoreGroups title="restoreTitle" onRestored={() => setRestoredHere(true)} />}
    </div>
  );
}
