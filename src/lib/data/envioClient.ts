/**
 * Server-only client for the hosted Envio GraphQL endpoint. The URL comes from
 * ENVIO_GRAPHQL_URL (server env, never NEXT_PUBLIC_) so the browser never calls Envio directly —
 * the free plan caps it at 100 queries/minute total, shared across every visitor.
 */
export class DataError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

export async function envioQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const url = process.env.ENVIO_GRAPHQL_URL;
  if (!url) throw new DataError("ENVIO_NOT_CONFIGURED", 503);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store", // caching is handled by our own TTL cache, keyed per route
    });
  } catch {
    throw new DataError("ENVIO_UNREACHABLE", 502);
  }

  const body = (await res.json().catch(() => null)) as GraphQLResponse<T> | null;
  if (!res.ok || !body) throw new DataError("ENVIO_UNREACHABLE", 502);
  if (body.errors?.length) throw new DataError("ENVIO_QUERY_FAILED", 502);
  if (body.data === undefined) throw new DataError("ENVIO_QUERY_FAILED", 502);
  return body.data;
}
