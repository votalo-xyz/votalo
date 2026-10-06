import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GroupsScreen } from "@/components/group/groups-screen";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/groups", title: (await getTranslations({ locale, namespace: "Groups" }))("metaTitle") });
}

export default async function GroupsPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveLocale(params);
  return <GroupsScreen />;
}
