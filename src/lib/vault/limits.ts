/**
 * Best-effort rate limits for the vault route. Per server instance, same tradeoff as
 * src/lib/relay/limits.ts: not a hard global guarantee, but enough to slow abuse.
 */
type Window = { start: number; count: number };

const perIp = new Map<string, Window>();
const perVaultId = new Map<string, Window>();

const IP_LIMIT = { windowMs: 60_000, max: 30 };
const VAULT_ID_LIMIT = { windowMs: 60_000, max: 10 };

function hit(map: Map<string, Window>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const w = map.get(key);
  if (!w || now - w.start >= windowMs) {
    map.set(key, { start: now, count: 1 });
    return true;
  }
  if (w.count >= max) return false;
  w.count += 1;
  return true;
}

export function checkIp(ip: string): boolean {
  return hit(perIp, ip, IP_LIMIT.windowMs, IP_LIMIT.max);
}

export function checkVaultId(vaultId: string): boolean {
  return hit(perVaultId, vaultId, VAULT_ID_LIMIT.windowMs, VAULT_ID_LIMIT.max);
}
