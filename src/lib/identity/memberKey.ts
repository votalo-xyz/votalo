import { createSecp256k1SigningSession, getEvmAddress, type EvmAddress, type Secp256k1Signature } from "@category-labs/mera";

// secp256k1 curve order
const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const MEMBER_KEY_INFO = new TextEncoder().encode("votalo-member-key-v1");

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt(`0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`);
}

/**
 * Derives the per-group secp256k1 private key from a 32-byte PRF output with HKDF-SHA256
 * (empty salt, info "votalo-member-key-v1"). Caller must zero the returned bytes.
 */
export async function deriveMemberPrivateKey(prfOutput: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  if (prfOutput.length !== 32) {
    throw new Error("PRF output must be 32 bytes");
  }
  const ikm = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: MEMBER_KEY_INFO },
    ikm,
    256,
  );
  const key = new Uint8Array(bits);
  const k = bytesToBigInt(key);
  if (k === 0n || k >= SECP256K1_N) {
    key.fill(0);
    throw new Error("Derived key is outside the secp256k1 range");
  }
  return key;
}

/** Member address for this group. The signing session is ended and the key buffer zeroed before returning. */
export async function memberAddressFromPrf(prfOutput: Uint8Array<ArrayBuffer>): Promise<EvmAddress> {
  const privateKey = await deriveMemberPrivateKey(prfOutput);
  try {
    const session = createSecp256k1SigningSession({ privateKey });
    try {
      return getEvmAddress(session.publicKey);
    } finally {
      session.end();
    }
  } finally {
    privateKey.fill(0);
  }
}

/** Signs a 32-byte EIP-712 digest as the group member. Session and key buffer are cleared after signing. */
export async function signDigestAsMember(
  prfOutput: Uint8Array<ArrayBuffer>,
  digest32: Uint8Array<ArrayBuffer>,
): Promise<{ address: EvmAddress; signature: Secp256k1Signature }> {
  const privateKey = await deriveMemberPrivateKey(prfOutput);
  try {
    const session = createSecp256k1SigningSession({ privateKey });
    try {
      const address = getEvmAddress(session.publicKey);
      const signature = await session.signDigest(digest32);
      return { address, signature };
    } finally {
      session.end();
    }
  } finally {
    privateKey.fill(0);
  }
}
