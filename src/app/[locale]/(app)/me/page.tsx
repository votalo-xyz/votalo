import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MeScreen } from "@/components/group/me-screen";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/me", title: (await getTranslations({ locale, namespace: "Me" }))("metaTitle") });
}

export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveLocale(params);
  return <MeScreen />;
}
