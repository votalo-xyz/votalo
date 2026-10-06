import type { Hex } from "viem";

/** One entry per group this browser knows about. */
export type VaultGroupEntry = {
  groupId: Hex;
  name: string;
  /** Unix seconds. */
  joinedAt: number;
  credentialId: string;
};

export type VaultContent = {
  v: 1;
  groups: VaultGroupEntry[];
};
