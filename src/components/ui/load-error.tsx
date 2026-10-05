"use client";

import { useTranslations } from "next-intl";
import { Button } from "./button";

/** Shown when a read fails. Says what happened in plain words and offers a retry. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("Common");
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-4 pt-8">
      <h1 className="text-h2">{t("loadErrorTitle")}</h1>
      <p className="text-lead text-muted">{t("loadErrorBody")}</p>
      <Button variant="secondary" onClick={onRetry}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
