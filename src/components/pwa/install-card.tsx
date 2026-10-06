"use client";

import { Download, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStore } from "@/data/store";
import { Button } from "../ui/button";
import { dismissInstall, promptInstall, useInstallState } from "./install-state";

/**
 * Offered once, after the first group is created or joined or the first vote is cast. Never on first load.
 * "Ahora no" hides it for 14 days; once installed it never shows again.
 */
export function InstallCard() {
  const t = useTranslations("Pwa");
  const store = useStore();
  const install = useInstallState();
  const active = !!store && (store.groups.length > 0 || Object.keys(store.members).length > 0 || Object.keys(store.votes).length > 0);

  if (!install.ready || !active || install.installed || install.dismissed || (!install.canPrompt && !install.ios)) return null;

  return (
    <section className="surface-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-identity-soft text-identity">
          <Download aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-h3 !text-[1.15rem]">{t("installTitle")}</h2>
          <p className="mt-1 text-muted">{t("installBody")}</p>
        </div>
      </div>
      {install.canPrompt ? (
        <Button onClick={() => void promptInstall()}>{t("installButton")}</Button>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">{t("iosTitle")}</p>
          <p className="flex items-center gap-2 text-muted">
            <Share aria-hidden="true" className="size-4 shrink-0" />
            {t("iosStep1")}
          </p>
          <p className="text-muted">{t("iosStep2")}</p>
        </div>
      )}
      <Button variant="ghost" size="sm" className="self-start" onClick={dismissInstall}>
        {t("installLater")}
      </Button>
    </section>
  );
}
