"use client";

import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Hex } from "viem";
import { joinGroup, type Invite } from "@/data/actions";
import type { GroupMode } from "@/data/types";
import { classifyError, type ErrorKey } from "../errors";
import { PrfUnavailable } from "../passkey/prf-unavailable";
import { Button } from "../ui/button";
import { useCredential } from "../use-credential";

const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const HEX65 = /^0x[0-9a-fA-F]{130}$/;

/** Reads an invite out of a link's query string: `?i=<inviteId>&s=<signature>`. */
export function parseInvite(params: { get: (name: string) => string | null }): Invite | null {
  const inviteId = params.get("i");
  const sig = params.get("s");
  if (inviteId && sig && HEX32.test(inviteId) && HEX65.test(sig)) {
    return { inviteId: inviteId as Hex, adminInviteSig: sig as Hex };
  }
  return null;
}

/**
 * Join step for someone with a link. Open groups join with one tap. Invite-only groups need the invite
 * in the link; without it the card explains why instead of offering a button that cannot work.
 */
export function JoinCard({
  groupId,
  groupName,
  mode,
  invite,
  onJoined,
}: {
  groupId: Hex;
  groupName: string;
  mode: GroupMode;
  invite: Invite | null;
  onJoined?: () => void;
}) {
  const t = useTranslations("Join");
  const e = useTranslations("Errors");
  const credential = useCredential();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function join() {
    if (!credential) return;
    setBusy(true);
    setError(null);
    try {
      await joinGroup({ credential, groupId, mode, invite: invite ?? undefined, name: groupName });
      onJoined?.();
    } catch (err) {
      setError(classifyError(err));
      setBusy(false);
    }
  }

  if (error === "PRF_UNAVAILABLE") return <PrfUnavailable onRetry={() => setError(null)} />;

  if (mode === "invite" && !invite) {
    return (
      <section className="surface-card flex gap-4 rounded-3xl p-5 sm:p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
          <LockKeyhole aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-h3 !text-[1.15rem]">{t("inviteOnlyTitle")}</h2>
          <p className="mt-2 text-muted">{t("inviteOnlyBody")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card rounded-3xl p-5 sm:p-6">
      <h2 className="text-h3">{t("title", { group: groupName })}</h2>
      <p className="mt-2 text-muted">{t("body")}</p>
      <Button onClick={join} disabled={busy} className="mt-5 w-full sm:w-auto">
        {busy ? t("joining") : t("button")}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {e(error)}
        </p>
      )}
    </section>
  );
}
