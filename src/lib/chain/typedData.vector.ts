import type { Address, Hex } from "viem";

/** Fixed inputs shared with contracts/test/Votalo.t.sol (testTypedDataVectorsMatchClient). */
export const VECTOR_VERIFYING_CONTRACT = "0x1000000000000000000000000000000000000009" as Address;
export const VECTOR_CHAIN_ID = 10143;
export const VECTOR_GROUP = `0x${"11".repeat(32)}` as Hex;
export const VECTOR_PROPOSAL = `0x${"22".repeat(32)}` as Hex;
export const VECTOR_INVITE = `0x${"33".repeat(32)}` as Hex;
export const VECTOR_MEMBER = "0x1000000000000000000000000000000000000001" as Address;
export const VECTOR_ADMIN = "0x1000000000000000000000000000000000000002" as Address;
export const VECTOR_DEADLINE = 1_700_000_000n;
