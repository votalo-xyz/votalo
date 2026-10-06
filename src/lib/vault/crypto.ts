/**
 * Encrypted group vault: key and id derivation, and AES-256-GCM encrypt/decrypt. The server never
 * sees plaintext, the PRF output, or any key — only { iv, ciphertext }.
 */
const VAULT_KEY_INFO = new TextEncoder().encode("votalo-vault-aes-v1");
const VAULT_ID_INFO = new TextEncoder().encode("votalo-vault-id-v1");
const IV_BYTES = 12;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Non-extractable AES-256-GCM key derived from the vault-key PRF output. Never leaves WebCrypto. */
export async function deriveVaultKey(prfOutput: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  if (prfOutput.length !== 32) throw new Error("PRF output must be 32 bytes");
  const ikm = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: VAULT_KEY_INFO },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Opaque lookup id (64 hex chars) derived from the vault-id PRF output. Not secret: it names a
 * ciphertext blob, and reveals nothing without the vault key. */
export async function deriveVaultId(prfOutput: Uint8Array<ArrayBuffer>): Promise<string> {
  if (prfOutput.length !== 32) throw new Error("PRF output must be 32 bytes");
  const ikm = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: VAULT_ID_INFO },
    ikm,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

export type EncryptedVault = { iv: string; ciphertext: string };

/** Encrypts `content` with a fresh random 12-byte IV. Base64 for both fields. */
export async function encryptVault(key: CryptoKey, content: unknown): Promise<EncryptedVault> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(content));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

/** Decrypts and JSON-parses. Throws if the key is wrong (AES-GCM authentication fails) or the
 * stored value is malformed. */
export async function decryptVault<T>(key: CryptoKey, encrypted: EncryptedVault): Promise<T> {
  const iv = base64ToBytes(encrypted.iv);
  const ciphertext = base64ToBytes(encrypted.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
