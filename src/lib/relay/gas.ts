/**
 * Explicit gas limits for relayed transactions. Monad charges the gas limit, even on revert, so
 * these are set per action, not estimated. Measured with `forge test --network monad --gas-report`
 * (max observed in parentheses), with headroom of roughly 40-50%.
 */
export const GAS_LIMITS = {
  createGroup: 300_000n, // max observed 175,904
  join: 250_000n, // max observed 122,962 (INVITE path verifies two signatures)
  createProposal: 350_000n, // max observed 201,935
  vote: 250_000n, // max observed 139,203
} as const;
