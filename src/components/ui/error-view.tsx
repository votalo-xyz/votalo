"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "./button";
import { cn } from "./cn";

/** What a route shows when it throws: plain words, a retry, and a way home. */
export function ErrorView({ reset, className }: { reset: () => void; className?: string }) {
  const t = useTranslations("Error");
  return (
    <div role="alert" className={cn("mx-auto flex max-w-md flex-col items-start gap-5 px-4 py-16", className)}>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-accent-text">
        <TriangleAlert aria-hidden="true" className="size-7" />
      </span>
      <h1 className="text-h2">{t("title")}</h1>
      <p className="text-lead text-muted">{t("body")}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>{t("retry")}</Button>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
