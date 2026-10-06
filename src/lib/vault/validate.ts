import { VaultStorageError } from "./storage";

const VAULT_ID_RE = /^[0-9a-f]{64}$/;
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;
export const MAX_BODY_BYTES = 16 * 1024;

export function isVaultId(v: string): boolean {
  return VAULT_ID_RE.test(v);
}

function fail(field: string): never {
  throw new VaultStorageError(`INVALID_INPUT:${field}`, 400);
}

/** Parses and validates a PUT body: `{ iv, ciphertext }`, both base64, iv decoding to exactly 12 bytes. */
export function parseEncryptedVault(raw: string): { iv: string; ciphertext: string } {
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    throw new VaultStorageError("TOO_LARGE", 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    fail("body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("body");
  const { iv, ciphertext } = body as Record<string, unknown>;
  if (typeof iv !== "string" || !BASE64_RE.test(iv) || iv.length % 4 !== 0) fail("iv");
  if (typeof ciphertext !== "string" || !BASE64_RE.test(ciphertext) || ciphertext.length % 4 !== 0 || ciphertext.length === 0) {
    fail("ciphertext");
  }
  if (decodedByteLength(iv) !== 12) fail("iv");
  return { iv, ciphertext };
}

function decodedByteLength(b64: string): number {
  try {
    return atob(b64).length;
  } catch {
    fail("encoding");
  }
}
