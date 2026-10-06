"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Hex } from "viem";
import { createInvite } from "@/data/actions";
import type { GroupMode } from "@/data/types";
import { classifyError, type ErrorKey } from "../errors";
import { ShareSheet } from "../share/share-sheet";
import { BackupStatus } from "./backup-status";
import { Button } from "../ui/button";
import { useCredential } from "../use-credential";

/**
 * Shares a group. An open group shares its plain link. An invite-only group makes a fresh single-use
 * invite first (one passkey prompt) and puts it in the link.
 */
export function InviteButton({
  groupId,
  groupName,
  mode,
  autoOpen = false,
  variant = "secondary",
}: {
  groupId: Hex;
  groupName: string;
  mode: GroupMode;
  autoOpen?: boolean;
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("Invite");
  const share = useTranslations("Share");
  const e = useTranslations("Errors");
  const credential = useCredential();
  const [path, setPath] = useState<string | null>(mode === "open" ? `/g/${groupId}` : null);
  const [open, setOpen] = useState(autoOpen && mode === "open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function start() {
    setError(null);
    if (mode === "open") {
      setOpen(true);
      return;
    }
    if (!credential) return;
    setBusy(true);
    try {
      const { inviteId, adminInviteSig } = await createInvite({ credential, groupId });
      setPath(`/g/${groupId}?i=${inviteId}&s=${adminInviteSig}`);
      setOpen(true);
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant={variant} size="sm" onClick={start} disabled={busy}>
        <UserPlus aria-hidden="true" className="size-4" />
        {busy ? t("creating") : t("button")}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {e(error)}
        </p>
      )}
      {path && (
        <ShareSheet
          path={path}
          heading={t("sheetTitle", { name: groupName })}
          text={share("groupText", { name: groupName })}
          open={open}
          onOpenChange={setOpen}
          notice={<BackupStatus />}
        />
      )}
    </div>
  );
}
