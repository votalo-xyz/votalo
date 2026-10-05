import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Hex } from "viem";
import { ProposalScreen } from "@/components/vote/proposal-screen";
import { buildDemo } from "@/data/demo";
import { resolveLocale } from "@/i18n/locale";
import { isHex32 } from "@/components/ids";

type Params = Promise<{ locale: string; groupId: string; proposalId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { proposalId } = await params;
  const t = await getTranslations({ locale, namespace: "Proposal" });
  const d = await getTranslations({ locale, namespace: "DemoData" });
  // Titles are not stored on chain, so the server only knows the example proposals. Others get a generic card.
  const demo = buildDemo(
    {
      group: d("group"),
      open: { title: d("open.title"), options: d.raw("open.options") as string[] },
      closed: { title: d("closed.title"), options: d.raw("closed.options") as string[] },
    },
    Math.floor(Date.now() / 1000),
  );
  const title = demo.proposals.find((p) => p.id === proposalId)?.title ?? t("ogTitle");
  return {
    title,
    description: t("ogTagline"),
    openGraph: { title, description: t("ogTagline"), type: "website" },
    twitter: { card: "summary_large_image", title, description: t("ogTagline") },
  };
}

export default async function ProposalPage({ params }: { params: Params }) {
  await resolveLocale(params);
  const { groupId, proposalId } = await params;
  if (!isHex32(groupId) || !isHex32(proposalId)) notFound();
  return <ProposalScreen groupId={groupId as Hex} proposalId={proposalId as Hex} />;
}
