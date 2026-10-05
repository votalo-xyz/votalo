import { cached } from "@/lib/data/cache";
import { DataError, envioQuery } from "@/lib/data/envioClient";
import { isEntityId } from "@/lib/data/validate";

export const runtime = "nodejs";

const QUERY = /* GraphQL */ `
  query Proposal($id: String!) {
    Proposal_by_pk(id: $id) {
      title
      options
      deadline
      voteCount
      optionCounts
      group {
        id
        name
      }
    }
  }
`;

// Shorter TTL than group/member: proposals show live vote counts.
const TTL_MS = 5_000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isEntityId(id)) {
    return Response.json({ error: "INVALID_ID" }, { status: 400 });
  }
  try {
    const data = await cached(`proposal:${id}`, TTL_MS, () => envioQuery(QUERY, { id }));
    return Response.json(data, { headers: { "cache-control": `public, max-age=${TTL_MS / 1000}` } });
  } catch (err) {
    if (err instanceof DataError) return Response.json({ error: err.code }, { status: err.status });
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
