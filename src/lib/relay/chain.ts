import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, VOTALO_ADDRESS } from "../chain/config";
import { votaloAbi } from "../chain/votaloAbi";
import { CONTRACT_ERRORS, RelayError } from "./errors";

/**
 * Server-only. The relayer key comes from RELAYER_PRIVATE_KEY and is never logged or returned.
 * The relayer pays gas only; it holds no user keys or funds.
 */
const transport = http(monadTestnet.rpcUrls.default.http[0]);
const publicClient = createPublicClient({ chain: monadTestnet, transport });

function relayerAccount() {
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new RelayError("RELAYER_NOT_CONFIGURED", 503);
  }
  return privateKeyToAccount(key as Hex);
}

type ActionName = "createGroup" | "join" | "createProposal" | "vote";

/** Simulates, then sends with an explicit gas limit, then waits for the receipt. Returns the tx hash. */
export async function relayAction(
  functionName: ActionName,
  args: readonly unknown[],
  gas: bigint,
): Promise<Hex> {
  const account = relayerAccount();
  const walletClient = createWalletClient({ account, chain: monadTestnet, transport });
  // viem cannot narrow args across a union of function names. The parser validates each argument
  // list against its ABI entry before this point, so the cast is confined to this call.
  const request = { address: VOTALO_ADDRESS, abi: votaloAbi, functionName, args, account, gas } as never;

  try {
    await publicClient.simulateContract(request);
  } catch (err) {
    throw mapRevert(err);
  }

  const hash = await walletClient.writeContract({ ...(request as object), chain: monadTestnet } as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") {
    throw new RelayError("TX_REVERTED", 502, hash);
  }
  return hash;
}

/** Maps a simulation revert to a contract error name when known. */
export function mapRevert(err: unknown): RelayError {
  if (err instanceof BaseError) {
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
    const name = reverted instanceof ContractFunctionRevertedError ? reverted.data?.errorName : undefined;
    if (name && (CONTRACT_ERRORS as readonly string[]).includes(name)) {
      return new RelayError(name, 422);
    }
  }
  return new RelayError("SIMULATION_FAILED", 422);
}
