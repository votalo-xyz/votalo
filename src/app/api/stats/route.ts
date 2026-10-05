import { getTotals } from "@/lib/chain/read";

// Totals read straight from the contract. Cached briefly so a busy landing page does not hammer the RPC.
export const revalidate = 30;

export async function GET() {
  try {
    const totals = await getTotals();
    return Response.json(
      {
        groups: totals.groups.toString(),
        members: totals.members.toString(),
        proposals: totals.proposals.toString(),
        votes: totals.votes.toString(),
      },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch {
    // The page shows a dash instead of inventing a number.
    return Response.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}
