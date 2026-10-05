import { defineChain, type Address } from "viem";

export const MONAD_TESTNET_CHAIN_ID = 10143;

export const monadTestnet = defineChain({
  id: MONAD_TESTNET_CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
});

/** Votalo contract on Monad testnet. Override with NEXT_PUBLIC_VOTALO_ADDRESS. */
export const VOTALO_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_VOTALO_ADDRESS as Address | undefined) ||
  "0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072";
