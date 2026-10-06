import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { ReloadButton } from "@/components/pwa/reload-button";

// Precached by the service worker, so it must be static: it is what a person sees with no connection.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Offline");

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-md flex-col items-start justify-center gap-5 px-4 py-16 sm:px-6">
      <h1 className="text-h2">{t("title")}</h1>
      <p className="text-lead text-muted">{t("body")}</p>
      <ReloadButton label={t("retry")} />
    </main>
  );
}
