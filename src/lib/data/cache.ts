/**
 * Per-instance TTL cache for proxied Envio queries. Not shared across serverless instances —
 * on Vercel each warm instance has its own cache, which is enough to cut repeat-view traffic to
 * Envio's free-plan rate limit (100 queries/minute total) without needing shared storage.
 */
type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await fetcher();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}
