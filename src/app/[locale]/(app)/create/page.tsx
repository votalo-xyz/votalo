import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreateGroupScreen } from "@/components/group/create-group-screen";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/create", title: (await getTranslations({ locale, namespace: "Create" }))("metaTitle") });
}

export default async function CreatePage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveLocale(params);
  return <CreateGroupScreen />;
}
