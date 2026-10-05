# Decisions

Running log of architecture decisions, deferred scope, and environment surprises.

## 2026-10-05

- **Foundry 1.8.4.** The local install was 1.7.1, below the v1.8+ requirement for
  Monad execution. Updated from the official `foundry_v1.8.4_win32_amd64.zip` release,
  checksum verified against the published `.sha256`.
- **Live chain check.** `web3_clientVersion` on `https://testnet-rpc.monad.xyz` returned
  `Monad/0.16.3`; `eth_chainId` returned `0x279f` (10143). Matches docs.monad.xyz/networks.json.
- **Scaffold.** Next.js 16 (App Router, TypeScript, ESLint, no Tailwind, `src/` dir).
  `create-next-app` rejects capital letters in package names, so it was run as `votalo`
  and copied into the repo root.
- **Spec copied unchanged** from the Monad hub to `docs/SPEC.md`.
- **.gitignore.** The generated `.env*` rule would ignore `.env.example`; narrowed to
  `.env` and `.env.*` with `!.env.example`.
- **License holder** is set to "Votalo contributors" as a placeholder. Confirm the legal name.

- **RP id from env, not hardcoded.** `NEXT_PUBLIC_RP_ID` when set, otherwise the current hostname
  (`src/lib/identity/rpId.ts`). Passkeys are bound to the RP id, so passkeys created on a
  `*.vercel.app` preview will not work on votalo.xyz. This is expected for testing.

## Phase 2: contract (2026-10-05)

- **Contract.** `contracts/src/Votalo.sol`, Solidity 0.8.28, OpenZeppelin Contracts 5.7.0 for
  `EIP712` and `ECDSA` only. Domain `{name: "Votalo", version: "1"}`; chain and contract address come
  from EIP-712's built-in binding.
- **Replay protection.** No nonces. Each signed action has a unique key that can be used once:
  `groupId` (CreateGroup), `inviteId` per group (Invite), `member` per group (Join), `proposalId`
  (CreateProposal), and `hasVoted[proposal][member]` (Vote). Signatures are bound to this chain and
  contract, so they cannot be replayed elsewhere.
- **Spec gaps I filled (review these):**
  - Group name: 1 to 80 bytes. The spec did not set a bound.
  - Option text: non-empty, at most 40 bytes. Title: non-empty, at most 140 bytes.
  - Proposal deadline: strictly in the future and at most 30 days out. Voting closes at the
    deadline (`block.timestamp >= deadline` reverts).
  - Options are hashed for storage with EIP-712's `string[]` encoding, so wallets can sign
    CreateProposal as typed data.
- **Public digest helpers** (`hashCreateGroup`, `hashJoin`, `hashInvite`, `hashCreateProposal`,
  `hashVote`) let clients and the relayer compute the digest that members sign, without
  reimplementing the encoding.
- **Tests.** 49 Foundry tests (42 unit, 7 fuzz at 512 runs each): signature checks and rejection,
  replay across groups, proposals, and contracts, single-use invites, one vote per member, deadline
  boundary, option and length bounds, OPEN vs INVITE, events, and counts.
- **Test pitfall.** `vm.expectRevert` applies to the next external call. Reading `v.MODE_OPEN()`
  as an argument consumed the expectation. Tests now use local constants.
- **Monad gas.** Monad charges the gas limit, not gas used. The deploy script simulates first, then
  deploys with an explicit `--gas-limit`. Rehearsal on an Anvil fork of testnet (`--network monad`):
  estimated 2,533,809 gas, deployed with 3,000,000 as the limit (about 18% headroom).
- **`forge script --gas-limit` is the block gas limit**, not the transaction gas limit. The
  transaction limit is set with `forge create --gas-limit`.
- **Lint notes.** `block-timestamp` on the deadline check is intended. `reentrancy-events` is a
  false positive: there are no external calls in `vote`.
- **Deploy not yet done.** Needs a funded testnet deployer, chosen by the user. Explorer verification
  uses Sourcify (`--verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/`).
  That publishes the source, so it is a separate step the user approves.

## CI fixes (2026-10-05)

- **`tsc` failed in CI** on `LayoutProps`, a global type that Next.js generates into `.next/types`
  during `next build`. CI runs `tsc` on a clean checkout, before any build. Fixed by typing the root
  layout props explicitly (`{ children: ReactNode }`), so the type check does not depend on generated
  files.
- **Metadata** still said "Create Next App" from the scaffold. Changed the title to "Votalo" and the
  description to the one-line product summary, because it is public-facing.
