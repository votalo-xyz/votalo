// Tells the browser whether the data proxy has an indexer behind it. It reads one server-only
// variable and never calls the indexer, so it costs nothing against the indexer's query quota.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ live: Boolean(process.env.ENVIO_GRAPHQL_URL) }, { headers: { "cache-control": "no-store" } });
}
