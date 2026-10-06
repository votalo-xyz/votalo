import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL } from "./site";

/** Absolute address of a page in one language. Spanish is at the root, English under /en, never /es. */
export function pageUrl(path: string, locale: Locale): string {
  return new URL(getPathname({ href: path, locale }), SITE_URL).toString();
}

/** The share image for a language: 1200x630, served directly (no redirect) from /og/<locale>.png. */
export function siteImageUrl(locale: Locale): string {
  return `${SITE_URL}/og/${locale}.png`;
}

/** Proposal share image: /og/proposal/<locale>/<proposalId>.png. */
export function proposalImageUrl(locale: Locale, proposalId: string): string {
  return `${SITE_URL}/og/proposal/${locale}/${proposalId}.png`;
}

type Args = {
  locale: Locale;
  /** Path without a language prefix, e.g. "/how-it-works" or "/g/0x…". */
  path: string;
  /** Page title. Left out for the home page, which uses the full site title. */
  title?: string;
  description?: string;
  image?: string;
};

/**
 * Everything a page needs to be found and shared: title, description, canonical address, the language
 * alternates (es, en, and x-default pointing at Spanish), and the Open Graph and Twitter cards. The same
 * address is used for canonical and og:url, so they cannot disagree.
 */
export async function pageMetadata({ locale, path, title, description, image }: Args): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Meta" });
  const url = pageUrl(path, locale);
  const es = pageUrl(path, "es");
  const en = pageUrl(path, "en");
  const shareTitle = title ? t("template").replace("%s", title) : t("title");
  const shareDescription = description ?? t("description");
  const shareImage = image ?? siteImageUrl(locale);
  const others = routing.locales.filter((l) => l !== locale).map((l) => (l === "en" ? "en_US" : "es_MX"));

  return {
    title: title ?? { absolute: t("title") },
    description: shareDescription,
    alternates: { canonical: url, languages: { es, en, "x-default": es } },
    openGraph: {
      type: "website",
      siteName: "Votalo",
      url,
      title: shareTitle,
      description: shareDescription,
      locale: locale === "en" ? "en_US" : "es_MX",
      alternateLocale: others,
      images: [{ url: shareImage, width: 1200, height: 630, alt: t("title") }],
    },
    twitter: { card: "summary_large_image", title: shareTitle, description: shareDescription, images: [shareImage] },
  };
}
