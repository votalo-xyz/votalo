import type { Hex } from "viem";

export type RelayRoute = "create-group" | "join" | "create-proposal" | "vote";

/** Error from the relay. `code` is a Votalo contract error name (InvalidSignature, AlreadyVoted, ...) or a relay code. */
export class RelayClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

/** Posts a signed action to /api/relay/<route>. Resolves with the transaction hash. */
export async function postRelay(route: RelayRoute, body: Record<string, unknown>): Promise<Hex> {
  let res: Response;
  try {
    res = await fetch(`/api/relay/${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new RelayClientError("NETWORK", 0);
  }
  const data = (await res.json().catch(() => ({}))) as { txHash?: Hex; error?: string };
  if (!res.ok || !data.txHash) {
    throw new RelayClientError(data.error || "INTERNAL", res.status);
  }
  return data.txHash;
}
