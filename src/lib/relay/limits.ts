/**
 * Best-effort rate limits. State lives in this server instance, so limits are per instance on
 * serverless hosting. They slow abuse and cap spend, but they are not a hard global guarantee.
 */
type Window = { start: number; count: number };

const perIp = new Map<string, Window>();
const perMember = new Map<string, Window>();
let daily = { day: "", count: 0 };

const IP_LIMIT = { windowMs: 60_000, max: 20 };
const MEMBER_LIMIT = { windowMs: 3_600_000, max: 30 };

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

export function checkMember(member: string): boolean {
  return hit(perMember, member.toLowerCase(), MEMBER_LIMIT.windowMs, MEMBER_LIMIT.max);
}

/** Daily global cap on relayed transactions. Set RELAY_DAILY_CAP to change it (default 200). */
export function checkDailyCap(): boolean {
  const cap = Number(process.env.RELAY_DAILY_CAP || 200);
  const day = new Date().toISOString().slice(0, 10);
  if (daily.day !== day) daily = { day, count: 0 };
  if (daily.count >= cap) return false;
  daily.count += 1;
  return true;
}
