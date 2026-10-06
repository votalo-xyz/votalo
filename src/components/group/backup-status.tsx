"use client";

import { Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { retryBackup, useBackupStatus } from "@/data/vault";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";

/**
 * Where the encrypted copy of "my groups" stands after a group is created or joined. It appears on its own
 * once a save starts, so the extra passkey prompt is explained while it is on screen, and stays quiet otherwise.
 */
export function BackupStatus({ className }: { className?: string }) {
  const t = useTranslations("Vault");
  const status = useBackupStatus();
  if (status === "idle") return null;

  const Icon = status === "saving" ? Lock : status === "saved" ? ShieldCheck : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 text-sm",
        status === "failed" ? "border-danger/40 bg-danger/5" : "border-line bg-surface-2 text-muted",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4 shrink-0", status === "saved" && "text-success-text", status === "failed" && "text-danger")}
      />
      <span className={cn("min-w-0 flex-1", status === "failed" && "font-medium text-fg")}>{t(status)}</span>
      {status === "failed" && (
        <Button variant="secondary" size="sm" onClick={() => void retryBackup()}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
