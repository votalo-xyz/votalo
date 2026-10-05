/** A 32-byte hex id as used in links: 0x followed by 64 hex characters. */
export function isHex32(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
