import { hexToBytes, keccak256, stringToBytes } from "viem";

/**
 * Fixed PRF salts for the encrypted group vault, separate from the per-group signing salts in
 * identity/groupSalt.ts. Each salt yields an unrelated PRF output, by WebAuthn PRF design, so
 * neither value can be derived from the other or from a per-group member key.
 */
export const VAULT_KEY_PRF_SALT: Uint8Array<ArrayBuffer> = new Uint8Array(hexToBytes(keccak256(stringToBytes("votalo/vault/v1"))));
export const VAULT_ID_PRF_SALT: Uint8Array<ArrayBuffer> = new Uint8Array(
  hexToBytes(keccak256(stringToBytes("votalo/vault-id/v1"))),
);
