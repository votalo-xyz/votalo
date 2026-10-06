import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Hex } from "viem";
import { isHex32 } from "@/components/ids";
import { ProposalScreen } from "@/components/vote/proposal-screen";
import { resolveLocale } from "@/i18n/locale";
import { readProposalTitle } from "@/seo/data";
import { pageMetadata, proposalImageUrl } from "@/seo/metadata";

type Params = Promise<{ locale: string; groupId: string; proposalId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { groupId, proposalId } = await params;
  const t = await getTranslations({ locale, namespace: "Proposal" });
  // The real question when the data service has it (that is what people see in the chat), else a generic title.
  const title = isHex32(proposalId) ? await readProposalTitle(proposalId) : undefined;
  return pageMetadata({
    locale,
    path: `/g/${groupId}/p/${proposalId}`,
    title: title ?? t("metaTitle"),
    description: t("ogTagline"),
    image: proposalImageUrl(locale, proposalId.toLowerCase()),
  });
}

export default async function ProposalPage({ params }: { params: Params }) {
  await resolveLocale(params);
  const { groupId, proposalId } = await params;
  if (!isHex32(groupId) || !isHex32(proposalId)) notFound();
  return <ProposalScreen groupId={groupId as Hex} proposalId={proposalId as Hex} />;
}
