import { concat, hexToBytes, keccak256, stringToBytes, type Hex } from "viem";

const GROUP_SALT_PREFIX = "votalo/group/v1/";

/**
 * PRF salt for one group: keccak256("votalo/group/v1/" || groupId).
 * Same passkey and group give the same PRF output; a different group gives an unrelated one.
 */
export function groupPrfSalt(groupId: Hex): Uint8Array<ArrayBuffer> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(groupId)) {
    throw new Error("groupId must be a 32-byte hex value");
  }
  const digest = keccak256(concat([stringToBytes(GROUP_SALT_PREFIX), hexToBytes(groupId)]));
  return new Uint8Array(hexToBytes(digest));
}
