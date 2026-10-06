import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Hex } from "viem";
import { isHex32 } from "@/components/ids";
import { GroupScreen } from "@/components/group/group-screen";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";
import { readGroupName } from "@/seo/data";

type Params = Promise<{ locale: string; groupId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { groupId } = await params;
  const name = isHex32(groupId) ? await readGroupName(groupId) : undefined;
  return pageMetadata({
    locale,
    path: `/g/${groupId}`,
    title: name ?? (await getTranslations({ locale, namespace: "GroupPage" }))("metaTitle"),
  });
}

export default async function GroupPage({ params }: { params: Params }) {
  await resolveLocale(params);
  const { groupId } = await params;
  if (!isHex32(groupId)) notFound();
  return (
    // The screen reads invite parameters from the link, so it sits in a Suspense boundary.
    <Suspense fallback={null}>
      <GroupScreen groupId={groupId as Hex} />
    </Suspense>
  );
}
