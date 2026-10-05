import { cached } from "@/lib/data/cache";
import { DataError, envioQuery } from "@/lib/data/envioClient";
import { isEntityId } from "@/lib/data/validate";

export const runtime = "nodejs";

const QUERY = /* GraphQL */ `
  query Group($id: String!) {
    Group_by_pk(id: $id) {
      name
      mode
      admin
      memberCount
      createdAt
      proposals(order_by: { createdAt: desc }) {
        id
        title
        deadline
        voteCount
      }
    }
  }
`;

const TTL_MS = 10_000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isEntityId(id)) {
    return Response.json({ error: "INVALID_ID" }, { status: 400 });
  }
  try {
    const data = await cached(`group:${id}`, TTL_MS, () => envioQuery(QUERY, { id }));
    return Response.json(data, { headers: { "cache-control": `public, max-age=${TTL_MS / 1000}` } });
  } catch (err) {
    if (err instanceof DataError) return Response.json({ error: err.code }, { status: err.status });
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
