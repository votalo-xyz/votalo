import { monadTestnet, VOTALO_ADDRESS } from "@/lib/chain/config";

export const GITHUB_URL = "https://github.com/votalo-xyz/votalo";
export const DOCS_URL = `${GITHUB_URL}/tree/main/docs`;
export const CONTRACT_ADDRESS = VOTALO_ADDRESS;
export const CONTRACT_URL = `${monadTestnet.blockExplorers.default.url}/address/${VOTALO_ADDRESS}`;
export const MONAD_URL = "https://www.monad.xyz";

/** "0x2cd3…f072" */
export function shortAddress(address: string, head = 6, tail = 4) {
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}
