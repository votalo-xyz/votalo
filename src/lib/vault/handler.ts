import { checkIp, checkVaultId } from "./limits";
import { VaultStorageError } from "./storage";
import { isVaultId, parseEncryptedVault } from "./validate";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Storage this handler needs. Lets tests inject an in-memory fake instead of Vercel Blob. */
export type VaultStore = {
  put(vaultId: string, body: string): Promise<void>;
  get(vaultId: string): Promise<string | null>;
};

/** PUT /api/vault/:vaultId. Body: `{ iv, ciphertext }`, both base64. Stores exactly those two
 * fields, nothing else — the server never sees plaintext, the PRF output, or any key. */
export async function handleVaultPut(req: Request, vaultId: string, store: VaultStore): Promise<Response> {
  try {
    if (!isVaultId(vaultId)) throw new VaultStorageError("INVALID_INPUT:vaultId", 400);
    if (!checkIp(clientIp(req))) throw new VaultStorageError("RATE_LIMITED", 429);
    if (!checkVaultId(vaultId)) throw new VaultStorageError("RATE_LIMITED", 429);

    const raw = await req.text();
    const { iv, ciphertext } = parseEncryptedVault(raw);
    await store.put(vaultId, JSON.stringify({ iv, ciphertext }));
    return json({ ok: true });
  } catch (err) {
    if (err instanceof VaultStorageError) return json({ error: err.code }, err.status);
    console.error("vault put failed");
    return json({ error: "INTERNAL" }, 500);
  }
}

/** GET /api/vault/:vaultId. Returns `{ iv, ciphertext }`, or 404 when nothing is stored. */
export async function handleVaultGet(req: Request, vaultId: string, store: VaultStore): Promise<Response> {
  try {
    if (!isVaultId(vaultId)) throw new VaultStorageError("INVALID_INPUT:vaultId", 400);
    if (!checkIp(clientIp(req))) throw new VaultStorageError("RATE_LIMITED", 429);

    const raw = await store.get(vaultId);
    if (raw === null) return json({ error: "NOT_FOUND" }, 404);
    return json(JSON.parse(raw));
  } catch (err) {
    if (err instanceof VaultStorageError) return json({ error: err.code }, err.status);
    console.error("vault get failed");
    return json({ error: "INTERNAL" }, 500);
  }
}
