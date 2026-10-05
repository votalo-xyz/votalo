import { cached } from "@/lib/data/cache";
import { DataError, envioQuery } from "@/lib/data/envioClient";
import { isMemberId } from "@/lib/data/validate";

export const runtime = "nodejs";

const QUERY = /* GraphQL */ `
  query MemberProfile($id: String!) {
    Member_by_pk(id: $id) {
      address
      joinedAt
      votesCast {
        proposal {
          id
          title
        }
        choice
        votedAt
      }
      proposalsCreated {
        id
        title
        createdAt
      }
    }
  }
`;

const TTL_MS = 10_000;

// Member id is `${groupId}-${address}`, address lowercase. See indexer/src/EventHandlers.ts.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isMemberId(id)) {
    return Response.json({ error: "INVALID_ID" }, { status: 400 });
  }
  try {
    const data = await cached(`member:${id}`, TTL_MS, () => envioQuery(QUERY, { id }));
    return Response.json(data, { headers: { "cache-control": `public, max-age=${TTL_MS / 1000}` } });
  } catch (err) {
    if (err instanceof DataError) return Response.json({ error: err.code }, { status: err.status });
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
