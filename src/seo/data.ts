import { GET as readGroup } from "@/app/api/data/group/[id]/route";
import { GET as readProposal } from "@/app/api/data/proposal/[id]/route";

/**
 * Names for share previews, read through the same handlers that serve /api/data/* (same cache and limits, no
 * network hop, and the indexer is never called from here). Anything that goes wrong, or is slow, gives
 * `undefined` so the page falls back to a generic title instead of failing or waiting.
 */
const TIMEOUT_MS = 2500;

async function read<T>(handler: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>, id: string): Promise<T | undefined> {
  try {
    const answer = handler(new Request("http://internal/api/data"), { params: Promise.resolve({ id }) }).then(async (res) =>
      res.ok ? ((await res.json()) as T) : undefined,
    );
    return await Promise.race([answer, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), TIMEOUT_MS))]);
  } catch {
    return undefined;
  }
}

export async function readProposalTitle(id: string): Promise<string | undefined> {
  const body = await read<{ Proposal_by_pk: { title: string } | null }>(readProposal, id.toLowerCase());
  return body?.Proposal_by_pk?.title || undefined;
}

export async function readGroupName(id: string): Promise<string | undefined> {
  const body = await read<{ Group_by_pk: { name: string } | null }>(readGroup, id.toLowerCase());
  return body?.Group_by_pk?.name || undefined;
}
