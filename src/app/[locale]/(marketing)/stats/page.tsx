import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StatsScreen } from "@/components/stats/stats-screen";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/stats", title: (await getTranslations({ locale, namespace: "Stats" }))("metaTitle") });
}

export default async function StatsPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveLocale(params);
  return <StatsScreen />;
}
