"use client";

import { Serwist } from "@serwist/window";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import "./install-state";

/**
 * Registers the service worker and offers a new version. A waiting version is never activated on its own:
 * only "Actualizar" makes it take over, and the page reloads once it has (so nobody is cut off mid-vote).
 */
export function PwaRoot() {
  const t = useTranslations("Pwa");
  const [waiting, setWaiting] = useState<Serwist | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Development builds have no precache manifest, and an old worker would hide your edits.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = new Serwist("/sw.js", { scope: "/", type: "classic" });
    sw.addEventListener("waiting", (event) => {
      // The first install has nothing to replace, so there is nothing to offer.
      if (!event.wasWaitingBeforeRegister) setWaiting(sw);
    });
    sw.register().catch(() => {});
  }, []);

  if (!waiting) return null;

  function update() {
    if (!waiting) return;
    setBusy(true);
    waiting.addEventListener("controlling", () => window.location.reload());
    waiting.messageSkipWaiting();
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card md:bottom-6"
    >
      <p className="font-semibold">{t("updateTitle")}</p>
      <p className="text-sm text-muted">{t("updateBody")}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={update} disabled={busy}>
          {t("updateButton")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setWaiting(null)}>
          {t("updateLater")}
        </Button>
      </div>
    </div>
  );
}
