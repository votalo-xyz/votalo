"use client";

import { Fingerprint } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Hex } from "viem";
import { useMyGroups } from "@/data/hooks";
import { useStore } from "@/data/store";
import { Link } from "@/i18n/navigation";
import { CredentialBadge } from "../brand/credential-badge";
import { InstallEntry } from "../pwa/install-entry";
import { shortAddress } from "../format";
import { PasskeySetup } from "../passkey/passkey-setup";
import { Skeleton } from "../ui/skeleton";
import { BackupStatus } from "./backup-status";
import { RestoreGroups } from "./restore-groups";
import { useCredential } from "../use-credential";

/** Overview: the passkey on this device, and the credential it made in each group. */
export function MeScreen() {
  const t = useTranslations("Me");
  const credential = useCredential();
  const store = useStore();
  const groups = useMyGroups();

  if (credential === undefined || !store) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
    );
  }

  if (credential === null) {
    return (
      <div className="mx-auto max-w-xl pt-2">
        <PasskeySetup onDone={() => {}} />
      </div>
    );
  }

  // Only groups where this browser knows the member address have a credential to show.
  const mine = groups.status === "ready" ? groups.data.filter(({ group }) => store.members[group.id as Hex]) : [];

  return (
    <div className="flex flex-col gap-10">
      <BackupStatus className="-mb-4" />
      <header className="flex items-start gap-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success-text">
          <Fingerprint aria-hidden="true" className="size-7" strokeWidth={1.6} />
        </span>
        <div>
          <h1 className="text-h2 !text-[clamp(1.6rem,1.2rem+1.8vw,2.4rem)]">{t("title")}</h1>
          <p className="mt-2 font-medium">{t("haveKey")}</p>
          <p className="mt-1 text-muted">{t("explain")}</p>
          <Link
            href="/about#identity"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent-text underline-offset-4 hover:underline"
          >
            {t("learn")}
          </Link>
        </div>
      </header>

      <section aria-labelledby="creds-title" className="flex flex-col gap-4">
        <h2 id="creds-title" className="text-h3">
          {t("groupsTitle")}
        </h2>
        {groups.status !== "ready" ? (
          <Skeleton className="h-24 w-full rounded-3xl" />
        ) : mine.length === 0 ? (
          <p className="text-muted">{t("noGroups")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map(({ group }) => {
              const member = store.members[group.id as Hex].address;
              return (
                <li key={group.id}>
                  <Link
                    href={`/g/${group.id}/me`}
                    className="surface-card flex items-center gap-4 rounded-3xl p-4 transition-[transform,border-color] hover:border-line-strong active:scale-[0.99]"
                  >
                    <CredentialBadge address={member} size={64} title={t("credentialIn", { group: group.name })} />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-display text-lg font-semibold leading-snug">
                        {group.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-sm text-muted">{shortAddress(member, 8, 6)}</span>
                    </span>
                    <span className="hidden shrink-0 text-sm font-semibold text-accent-text sm:block">
                      {t("openStanding")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RestoreGroups title="restoreMeTitle" />

      <InstallEntry />
    </div>
  );
}
