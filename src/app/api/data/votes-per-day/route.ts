import { cached } from "@/lib/data/cache";
import { DataError, envioQuery } from "@/lib/data/envioClient";

export const runtime = "nodejs";

const QUERY = /* GraphQL */ `
  query VotesPerDay {
    DailyVoteCount(order_by: { id: asc }) {
      id
      votes
    }
  }
`;

const TTL_MS = 10_000;

export async function GET() {
  try {
    const data = await cached("votes-per-day", TTL_MS, () => envioQuery(QUERY));
    return Response.json(data, { headers: { "cache-control": `public, max-age=${TTL_MS / 1000}` } });
  } catch (err) {
    if (err instanceof DataError) return Response.json({ error: err.code }, { status: err.status });
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
