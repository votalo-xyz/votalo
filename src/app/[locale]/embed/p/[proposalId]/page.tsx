import { notFound } from "next/navigation";
import { GET as readProposal } from "@/app/api/data/proposal/[id]/route";
import { EmbedTheme, themeFromParam } from "@/components/embed/embed-theme";
import { EmbedWidget } from "@/components/embed/embed-widget";
import { isHex32 } from "@/components/ids";
import type { ProposalRow } from "@/data/api";
import { resolveLocale } from "@/i18n/locale";

type Props = {
  params: Promise<{ locale: string; proposalId: string }>;
  searchParams: Promise<{ theme?: string | string[] }>;
};

/**
 * Reads the proposal through the same handler that serves /api/data/proposal/:id (same cache, same limits),
 * so the widget shows results on first paint and the indexer is never called from here directly.
 * `undefined`: the data service could not answer, so the browser will try. `null`: there is no such proposal.
 */
async function firstRead(id: string): Promise<ProposalRow | null | undefined> {
  try {
    const res = await readProposal(new Request("http://internal/api/data/proposal"), { params: Promise.resolve({ id }) });
    if (!res.ok) return undefined;
    return ((await res.json()) as { Proposal_by_pk: ProposalRow | null }).Proposal_by_pk;
  } catch {
    return undefined;
  }
}

export default async function EmbedProposalPage({ params, searchParams }: Props) {
  await resolveLocale(params);
  const { proposalId } = await params;
  const theme = themeFromParam((await searchParams).theme);

  // A malformed or unknown id is a real 404. The widget draws its own small not-found state (see ../../not-found.tsx).
  if (!isHex32(proposalId)) notFound();
  const id = proposalId.toLowerCase();
  const initial = await firstRead(id);
  if (initial === null) notFound();

  return (
    <EmbedTheme theme={theme}>
      <EmbedWidget proposalId={id} initial={initial ?? null} />
    </EmbedTheme>
  );
}
