import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PitchDeck } from "@/components/pitch/pitch-deck";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { prefixedLocale } from "@/i18n/routing";

const pitchPath = (locale: string) => (locale === prefixedLocale ? `/${prefixedLocale}/pitch` : "/pitch");

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Pitch" });
  const path = pitchPath(locale);
  const title = `${t("metaTitle")} · Votalo`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: path, languages: { es: pitchPath("es"), en: pitchPath("en") } },
    openGraph: {
      type: "website",
      url: path,
      siteName: "Votalo",
      title,
      description: t("metaDescription"),
      locale: locale === "en" ? "en_US" : "es_MX",
    },
    twitter: { card: "summary_large_image", title, description: t("metaDescription") },
  };
}

export default async function PitchPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Pitch" });

  return (
    <>
      <header className="deck-chrome fixed inset-x-0 top-1 z-50 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t("backToSite")}
          className="inline-flex min-h-11 items-center gap-3 rounded-full border border-line bg-[var(--nav-bg)] py-1 pl-3 pr-4 backdrop-blur-xl"
        >
          <ArrowLeft aria-hidden="true" className="size-4 text-muted" />
          <Logo />
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-line bg-[var(--nav-bg)] p-1 backdrop-blur-xl">
          <LanguageSwitch className="border-0" />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="overflow-x-clip">
        <PitchDeck />
      </main>
    </>
  );
}
