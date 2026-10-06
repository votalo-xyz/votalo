"use client";

import { Download, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "../ui/button";
import { promptInstall, useInstallState } from "./install-state";

/** Always available in Me until the app is installed. Without a browser prompt it says where the menu is. */
export function InstallEntry() {
  const t = useTranslations("Pwa");
  const install = useInstallState();
  if (!install.ready || install.installed) return null;

  return (
    <section className="surface-card flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
          <Download aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-h3 !text-[1.15rem]">{t("entry")}</h2>
          <p className="mt-1 text-muted">{install.canPrompt || install.ios ? t("entryBody") : t("entryFallback")}</p>
          {install.ios && !install.canPrompt && (
            <div className="mt-3 flex flex-col gap-1 text-sm text-muted">
              <p className="flex items-center gap-2">
                <Share aria-hidden="true" className="size-4 shrink-0" />
                {t("iosStep1")}
              </p>
              <p>{t("iosStep2")}</p>
            </div>
          )}
        </div>
      </div>
      {install.canPrompt && (
        <Button variant="secondary" size="sm" onClick={() => void promptInstall()}>
          {t("entry")}
        </Button>
      )}
    </section>
  );
}
