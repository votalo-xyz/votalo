#!/usr/bin/env bash
# Deploys Votalo to Monad testnet (chain 10143).
# Required env: MONAD_TESTNET_RPC_URL, DEPLOY_GAS_LIMIT (explicit gas limit, Monad charges the limit),
# and one of: DEPLOYER_ACCOUNT (a Foundry keystore name) or DEPLOYER_PRIVATE_KEY (never commit it).
set -euo pipefail

: "${MONAD_TESTNET_RPC_URL:?set MONAD_TESTNET_RPC_URL}"
: "${DEPLOY_GAS_LIMIT:?set DEPLOY_GAS_LIMIT (explicit gas limit; Monad charges the limit)}"

if [[ -n "${DEPLOYER_ACCOUNT:-}" ]]; then
  signer=(--account "$DEPLOYER_ACCOUNT")
elif [[ -n "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  signer=(--private-key "$DEPLOYER_PRIVATE_KEY")
else
  echo "set DEPLOYER_ACCOUNT (keystore) or DEPLOYER_PRIVATE_KEY" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "1/2 simulate (no broadcast): eth_call-style dry run against the RPC"
forge script script/Deploy.s.sol:Deploy --rpc-url "$MONAD_TESTNET_RPC_URL" --chain 10143 "${signer[@]}"

echo "2/2 broadcast with explicit gas limit"
forge create src/Votalo.sol:Votalo \
  --rpc-url "$MONAD_TESTNET_RPC_URL" \
  --gas-limit "$DEPLOY_GAS_LIMIT" \
  --broadcast \
  "${signer[@]}"
