"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "../ui/cn";

function Switch({ className }: { className?: string }) {
  const t = useTranslations("Common");
  const active = useLocale();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = Object.fromEntries(params.entries());

  return (
    <nav
      aria-label={t("language")}
      className={cn("inline-flex rounded-full border border-line-strong bg-surface p-0.5", className)}
    >
      {routing.locales.map((locale) => {
        const current = locale === active;
        return (
          <Link
            key={locale}
            href={{ pathname, query }}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-current={current ? "true" : undefined}
            aria-label={t(`languageName.${locale}`)}
            className={cn(
              "inline-flex min-h-11 min-w-12 items-center justify-center rounded-full px-3 text-sm font-semibold uppercase tracking-wide transition-colors duration-200",
              current ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {locale}
          </Link>
        );
      })}
    </nav>
  );
}

export function LanguageSwitch({ className }: { className?: string }) {
  return (
    // useSearchParams needs a boundary so static pages keep prerendering.
    <Suspense fallback={<div className={cn("h-11 w-[5.75rem]", className)} aria-hidden="true" />}>
      <Switch className={className} />
    </Suspense>
  );
}
