"use client";

import { useLocale, useTranslations } from "next-intl";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { usePathname } from "@/i18n/navigation";
import { prefixedLocale, routing } from "@/i18n/routing";
import { cn } from "../ui/cn";

/** Only `prefixedLocale` carries a URL prefix — see routing.ts. next-intl's locale-prefix omission
 * only applies to pathnames it recognizes as one of its typed routes; a pathname with a dynamic
 * segment already filled in (e.g. "/g/0x…") is not one of those, so passing it through `Link`'s
 * `{ pathname, locale }` form re-adds the default locale's prefix. Built by hand instead, using the
 * one rule the rest of the app already applies (e.g. share-sheet.tsx's `withoutLocale`). */
function switchHref(pathname: string, query: string, locale: string): string {
  const prefix = `/${prefixedLocale}`;
  const withoutPrefix = (pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname === prefix ? "/" : pathname) || "/";
  const base = locale === prefixedLocale ? (withoutPrefix === "/" ? prefix : `${prefix}${withoutPrefix}`) : withoutPrefix;
  return query ? `${base}?${query}` : base;
}

function Switch({ className }: { className?: string }) {
  const t = useTranslations("Common");
  const active = useLocale();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();

  return (
    <nav
      aria-label={t("language")}
      className={cn("inline-flex rounded-full border border-line-strong bg-surface p-0.5", className)}
    >
      {routing.locales.map((locale) => {
        const current = locale === active;
        return (
          // The href below already has its final locale prefix (or lack of one), built by hand (see
          // switchHref). next-intl's own Link re-prefixes any relative href with the page's *current*
          // locale, which would double it up here; next/link's Link leaves the string exactly as given.
          <NextLink
            key={locale}
            href={switchHref(pathname, query, locale)}
            hrefLang={locale}
            lang={locale}
            aria-current={current ? "true" : undefined}
            aria-label={`${locale.toUpperCase()}, ${t(`languageName.${locale}`)}`}
            className={cn(
              "inline-flex min-h-11 min-w-12 items-center justify-center rounded-full px-3 text-sm font-semibold uppercase tracking-wide transition-colors duration-200",
              current ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {locale}
          </NextLink>
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
