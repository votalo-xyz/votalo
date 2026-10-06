import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Hex } from "viem";
import { isHex32 } from "@/components/ids";
import { StandingScreen } from "@/components/group/standing-screen";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";

type Params = Promise<{ locale: string; groupId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { groupId } = await params;
  return pageMetadata({ locale, path: `/g/${groupId}/me`, title: (await getTranslations({ locale, namespace: "Standing" }))("metaTitle") });
}

export default async function StandingPage({ params }: { params: Params }) {
  await resolveLocale(params);
  const { groupId } = await params;
  if (!isHex32(groupId)) notFound();
  return <StandingScreen groupId={groupId as Hex} />;
}
