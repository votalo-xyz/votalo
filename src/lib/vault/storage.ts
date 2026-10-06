/**
 * Server-only. Stores the encrypted vault blob in Vercel Blob, private access, keyed by the vault
 * id. The token comes only from the BLOB_READ_WRITE_TOKEN env var (set by linking the Blob store to
 * this Vercel project); it is never read from a request or written to a log.
 */
import { BlobNotFoundError, get, put } from "@vercel/blob";

export class VaultStorageError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

function pathFor(vaultId: string): string {
  return `vault/${vaultId}.json`;
}

function token(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new VaultStorageError("VAULT_STORAGE_NOT_CONFIGURED", 503);
  return t;
}

/** Overwrites the stored value for this vault id. `body` must already be the final JSON string. */
export async function putVaultBlob(vaultId: string, body: string): Promise<void> {
  await put(pathFor(vaultId), body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    token: token(),
  });
}

/** Returns the stored JSON string, or `null` if nothing is stored for this vault id. */
export async function getVaultBlob(vaultId: string): Promise<string | null> {
  try {
    const result = await get(pathFor(vaultId), { access: "private", useCache: false, token: token() });
    if (!result || result.stream === null) return null;
    return await new Response(result.stream).text();
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}
