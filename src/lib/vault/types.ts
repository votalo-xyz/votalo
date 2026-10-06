import type { Hex } from "viem";

/**
 * One entry per group this browser knows about. `memberAddress` is this passkey's address in that group.
 * It sits inside the encrypted vault, so only the passkey holder can read or write it; restoring it
 * avoids one passkey prompt per group. Entries saved before it existed omit it, and restore asks for it.
 */
export type VaultGroupEntry = {
  groupId: Hex;
  name: string;
  /** Unix seconds. */
  joinedAt: number;
  credentialId: string;
  memberAddress?: Hex;
};

export type VaultContent = {
  v: 1;
  groups: VaultGroupEntry[];
};
