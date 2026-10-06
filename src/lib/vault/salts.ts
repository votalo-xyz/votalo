import { hexToBytes, keccak256, stringToBytes } from "viem";

/**
 * The one PRF salt for the encrypted group vault, separate from the per-group signing salt in
 * identity/groupSalt.ts. A single PRF evaluation yields the vault key and the vault id, via two HKDF
 * info strings (see crypto.ts), so the whole vault costs one passkey prompt.
 */
export const VAULT_PRF_SALT: Uint8Array<ArrayBuffer> = new Uint8Array(hexToBytes(keccak256(stringToBytes("votalo/vault/v1"))));
