import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isHex32 } from "@/components/ids";

// Same reason as the group layout: validate before the page streams, so a bad id is a real 404.
export default async function ProposalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  if (!isHex32(proposalId)) notFound();
  return children;
}
