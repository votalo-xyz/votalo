import { relayAction } from "./chain";
import { RelayError } from "./errors";
import { checkSigner, parseAction, type ActionName } from "./actions";
import { checkDailyCap, checkIp, checkMember } from "./limits";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Handles one relay request end to end. Never returns the relayer key or raw internals. */
export async function handleRelay(req: Request, action: ActionName): Promise<Response> {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkIp(ip)) throw new RelayError("RATE_LIMITED", 429);

    const parsed = await parseAction(action, req);
    await checkSigner(parsed);
    if (!checkMember(parsed.signer)) throw new RelayError("RATE_LIMITED", 429);
    if (!checkDailyCap()) throw new RelayError("DAILY_CAP_REACHED", 503);

    const txHash = await relayAction(action, parsed.args, parsed.gas);
    return json({ txHash });
  } catch (err) {
    if (err instanceof RelayError) {
      return json({ error: err.code, ...(err.txHash ? { txHash: err.txHash } : {}) }, err.status);
    }
    console.error("relay failed", action);
    return json({ error: "INTERNAL" }, 500);
  }
}
