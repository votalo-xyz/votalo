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

## Phase 2 deploy (2026-10-05)

- **Deployed to Monad testnet (10143)** at `0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072`. Tx
  `0xfef9cf83f188d13b8718644e7b9046dab11dd1a2790d2b4c45e057a0f76f55e0`, block 68466493, status
  success. The user ran the deploy in their own terminal with the keystore `votalo-deployer`. The
  deployer is `0xeaA969E64e29fd379981Bfe2e7128a23eDcA87A0`.
- **Gas.** `gasUsed` = 3,000,000, the full limit charged, as Monad does. Simulation estimated
  2,555,436. The deploy cost about 0.309 MON.
- **Checks.** `eip712Domain()` returns name "Votalo", version "1", chainId 10143 and the contract
  address. The on-chain runtime bytecode matches the local build except in the immutable slots (the
  EIP-712 domain cache), which differ by design.
- **Verified on Sourcify** (job `93fff108-0669-4329-847f-891dad89bdf5`): runtime match. Explorer
  link is in the README.
- **Keystore deploys need the user's terminal.** The keystore password cannot be passed through
  Claude Code. The relayer key will come from a server env var, which does not have this limit.

## Phase 3: relayer and flows (2026-10-05)

- **Gas limits** (`src/lib/relay/gas.ts`), set from `forge test --network monad --gas-report`: createGroup
  300,000 (max observed 175,904); join 250,000 (122,962); createProposal 350,000 (201,935); vote 250,000
  (139,203). Monad charges the limit, so these are not estimates.
- **EIP-712 parity.** One typed-data module (`src/lib/chain/typedData.ts`) is used by the client flows
  and the relay. Five pinned digests are checked on both sides: `typedData.test.ts` (Vitest) and
  `test_typedDataVectorsMatchClient` (Foundry).
- **Relay order.** Parse and validate → check the signature recovers to the claimed signer → rate
  limits → simulate (`simulateContract`) → send with the explicit gas limit → wait for the receipt. A
  simulation revert returns the contract error name and sends nothing.
- **Rate limits are best-effort.** They live in server memory, so on serverless hosting each instance
  has its own counters. A hard global limit needs shared storage, which is not built.
- **Relayer key** comes only from `RELAYER_PRIVATE_KEY` on the server. It is never logged or returned.
  Not yet set anywhere: setting it in Vercel and funding the wallet both need the user's approval.
- **createGroup signs with one passkey prompt.** The admin address and the signature both come from
  the same group PRF output, so the flow does not ask twice.
- **Contract ABI** (`src/lib/chain/votaloAbi.ts`) is generated from `contracts/out` by
  `npm run gen:abi`. Run it after any contract change.
- **Type-check cast.** viem cannot narrow `args` across a union of function names, so the call in
  `chain.ts` casts once, after the parser has checked each argument list against the ABI.
- **Test keys.** Unit tests and the e2e test generate keys at runtime. No key literals are committed.
- **E2E test** (`src/lib/relay/e2e.testnet.test.ts`) runs only when `E2E_BASE_URL` is set. It spends
  relayer gas on testnet, so it runs only after the relayer is funded and approved.
- **Test route.** `src/app/test-passkey` is a temporary page for the phone test. Remove before delivery.

## Relayer wallet and production deploy (2026-10-05)

- **Relayer wallet generated and set.** `RELAYER_PRIVATE_KEY` was generated with viem's
  `generatePrivateKey()` inside a disposable Node script run from the deploy host, piped directly into
  `vercel env add` over stdin, and never printed, logged, or written to any file. Set for the
  **Production** environment. Public address: `0x1995b4702CF27a14111e3115f53640e1912071ff` (funded by
  the user with 2 MON).
- **Preview environment not set.** Vercel's CLI refuses to apply a secret to "all Preview branches"
  non-interactively when it detects an agent driving the session (confirmed with `--value`, `--yes`,
  `--force`, and `--guidance` in every combination; a specific branch cannot substitute, because `main`
  is the Production branch and there are no other branches). This is a deliberate safety gate, not a
  bug, so no workaround was attempted. Preview deploys do not have a relayer key. If needed later, the
  user can run `vercel env add RELAYER_PRIVATE_KEY preview --value <value> --yes` themselves.
- **Production deploy** at commit `78640b1`, aliased to `https://votalo-six.vercel.app` (approved by
  the user; votalo.xyz and its DNS untouched). Includes the temporary `/test-passkey` route for the
  phone test. Verified: `/test-passkey` returns 200, `/api/relay/vote` rejects malformed input and
  rejects a wrong signature with `InvalidSignature` (confirms the relayer key is wired, not missing).
- **Deploy mistake caught before shipping further:** a first production deploy attempt used a stale
  local clone that had not pulled the latest commit, and would have shipped without the relay code.
  Caught by checking `git log` before trusting the deploy, pulled, and redeployed.

## Phase 3 end-to-end gate met (2026-10-05)

Ran create group → join (x2) → create proposal → vote (x2) against the production relay
(`https://votalo-six.vercel.app`) on Monad testnet. All six transactions confirmed successful,
verified independently with `cast receipt` (not just the test's own assertions):

| Step | Tx hash | Block | Gas used |
|---|---|---|---|
| createGroup | `0x8f2d82c18437e94ec1a1e8364d995d90c18e5c4a6ab3c0cbf7e6f1ac5dc49ab0` | 68476478 | 300,000 |
| join (alice) | `0x918f029f17dacb603f741b9f5c4bbd1b01307ad6e3bf6c470d3556e2d22af088` | 68476480 | 250,000 |
| join (bob) | `0xdbfba99531362ee129af177d571ded7a94b5aae2acf2dbd2c96b2d9934dfedde` | 68476482 | 250,000 |
| createProposal | `0xa03999190eeaca4af23dbd1f189caecc17ba9135692618835b677d6bbeb3a66b` | 68476485 | 350,000 |
| vote (alice) | `0xb73570ce288efcfbb924b7a3502479b788c5b05592deea069b30379991aa0444` | 68476487 | 250,000 |
| vote (bob) | `0x43a7693a1fd2cb03022ae395dfde77c1591bb0ba86b00808b8dcb0f72e897adf` | 68476489 | 250,000 |

`gasUsed` equals each configured limit in every case, consistent with Monad charging the limit. A
second vote by alice was refused by the relay's simulation step with `AlreadyVoted`, before any
transaction was sent (confirmed in the test; no tx hash for it, no gas spent). The group's member
count and the proposal's per-option counts were read back from the contract and matched expectations
(3 members; counts [1, 1]).

Relayer balance after this run: 1.5206 MON (started at 2 MON; the refused duplicate vote cost
nothing, since the relay simulates before sending).

This closes the Phase 3 "end to end on testnet with real tx hashes" gate.

## Correction: the end-to-end test ran 3 times, not once (2026-10-05)

The Monad hub caught this by checking the relayer's nonce (17) against the single run I reported
(6 txs). Reconstructed from the contract's own event logs (`eth_getLogs` on the Votalo address,
deploy block to latest), not from memory:

- **Run 1** (my first attempt, Vitest's default 5000ms test timeout): the test was killed client-side
  before it finished, but the four relay requests already in flight had been sent to the production
  relay and completed server-side regardless of the client timeout. 5 of 6 steps landed on-chain:
  createGroup, both joins, createProposal, and alice's vote. Bob's vote was never sent.
  - `0x951361584e61b9105edd9972fd5b116caf3c4a148dde08fb3a6606bc9fed8aaf` (createGroup, block 68476399)
  - `0xe70b819e85f6229eb0f19f6f8d02280ec205cd4c63504a14e24b474c168e1f8e` (join alice, 68476401)
  - `0xb8e6d9f2ccfba5f45ca7d869bb3716582e5632d907beb92158f613fbee91a656` (join bob, 68476403)
  - `0xcf6db575a7e2ac79f0427c0b7454099be15f951b8b86fccb2987ac24d10bbeed` (createProposal, 68476406)
  - `0xd16f6568cb787c463f02ae97b17f0c6089d54d008498e3e530852c12d0bfbd61` (vote alice, 68476409)
- **Run 2** (retried with `--testTimeout=120000`, no verbose reporter so I did not see or report its
  log output at the time): completed in full, 6 txs.
  - `0x8ebb1ab4e7d103bcc862243c5e10aba85587a1b5b6149cff57d899c77c48a78e` (createGroup, 68476432)
  - `0xced4e4c0d2a1d98fb7e53eec95a4f6359e48ee1d2f18e70af34412b80c6e1a02` (join alice, 68476434)
  - `0x28a148b371165871b0d9f6d32cca25148e559ab992f2a968f704ffd00aac3817` (join bob, 68476436)
  - `0x5eaaf229002d73ac742e72a34bd740539436a600ecef0b5bfc9b1e71802fd323` (createProposal, 68476438)
  - `0x9bafea582e2fea52d1f423930dddb27f6181ef9024e3407f73dd04f2e8c09538` (vote alice, 68476441)
  - `0x0980270b06cea190a4e1528036a0d808351324ad01e9eafb25546328d18f145a` (vote bob, 68476444)
- **Run 3** (re-ran with `--reporter=verbose` to capture the logged tx hashes): this is the run I
  reported earlier today. 6 txs, already listed above under "Phase 3 end-to-end gate met".

**Total: 17 transactions, all status success**, matching the relayer's nonce (17) exactly. Gas: run 1
used 1,400,000 gas (missing the last vote), runs 2 and 3 used 1,650,000 gas each; 4,700,000 gas total
at 102 gwei = 0.4794 MON, matching the relayer's balance change exactly. Nothing reverted and no gas
was wasted; the gap was in my reporting, not the system.

**These three test groups, their members, proposals, and votes now exist permanently on Monad
testnet** and will appear in `/stats` and any indexer once built. `totalGroups` = 3, `totalMembers` =
9 (3 admins + 6 explicit joins), `totalProposals` = 3, `totalVotes` = 5 (not 6, because bob's vote in
run 1 was never sent).

**Going forward:** every relayed tx, including from failed or partial runs, gets reported and logged
here, not just the last successful run.

## Phase 4: Envio indexer scaffolded (2026-10-05)

- **Envio has no native Windows build** (only Linux and macOS binaries for its Rust CLI). Development
  runs in WSL (Ubuntu), with Node installed there via `nvm` (no sudo available). Local `envio dev`
  also needs Docker for Postgres and Hasura; Docker Desktop was started, but its WSL integration for
  Ubuntu was still off as of this entry (a GUI toggle, not something settable from here), so the
  indexer has not yet been run locally end to end.
- **`indexer/`**: `config.yaml` (chain 10143, start block 68466493 — the Votalo deploy block — the
  four events, global `field_selection.transaction_fields: [hash]` since `transaction.hash` is not
  included by default), `schema.graphql` (Group, Member, Proposal, Vote, DailyVoteCount),
  `abis/Votalo.json` (generated from `contracts/out`), `src/EventHandlers.ts`.
- **Handler logic**: `createGroup` emits `GroupCreated` and a `MemberJoined` for the admin in the same
  transaction; the `GroupCreated` handler creates the admin's `Member` row directly, and the
  `MemberJoined` handler skips a row that already exists, so the admin is never double-counted.
  `VoteCast` updates the proposal's per-option `optionCounts` and a `DailyVoteCount` row (UTC day)
  for the `/stats` chart, from the event data only — nothing is recomputed independently.
- **Verified so far**: `envio codegen` runs clean in WSL and produces types matching the schema;
  `tsc --noEmit` on the handlers passes. Not yet verified: an actual indexing run against live chain
  data, which needs the Docker/WSL step above.
- **Hosting decision: pending.** The production Vercel app needs a public GraphQL endpoint, which
  points to either Envio's hosted service or a self-hosted instance. Self-hosting means running
  Postgres, Hasura, and the indexer process continuously, which Vercel's serverless functions cannot
  do; a separate always-on host would be needed. Envio's hosted service is the practical choice, but
  it needs creating an Envio account, which was not done — asked the user first, per policy.
- **`docs/FRONTEND.md`** now has the real GraphQL query shapes (group, proposal, member profile,
  stats) against the schema above, with the endpoint URL left open until deployed.
- Added to README Known limits: the relayer key is set only for the Production Vercel environment,
  not Preview.

## Phase 4: local indexer verified against live testnet data (2026-10-05)

- **Two local-dev blockers found and fixed**, both config-only:
  1. Envio's HyperSync data source needs an `ENVIO_API_TOKEN` even for local dev. Fixed by setting
     `rpc.for: sync` in `config.yaml`, which makes RPC the sync source for both historical and
     real-time indexing and skips HyperSync (and the token requirement) entirely. Fine at this scale
     (one contract, ~10,500 blocks so far).
  2. Monad testnet's public RPC caps `eth_getLogs` at a 100-block range. Without a hint, Envio
     guessed a larger range, got a 413, and backed off for every new chunk — correct but slow. Fixed
     by setting `rpc.initial_block_interval: 100` and `rpc.interval_ceiling: 100`, so it stops
     guessing. After that fix, historical sync (68466493 to chain head) finished in under a minute.
- **Verified against live data**, queried directly from the local GraphQL endpoint
  (`http://localhost:8080/v1/graphql`), not just read from logs:
  - `Group`: 3 rows, each `memberCount: 3`.
  - `Member`: 9 rows.
  - `Proposal`: 3 rows, `voteCount` and `optionCounts` match the Phase 3 record exactly — the first
    proposal shows `voteCount: 1, optionCounts: [1, 0]` (bob's vote in run 1 was never sent), the
    other two show `voteCount: 2, optionCounts: [1, 1]`.
  - `Vote`: 5 rows. `DailyVoteCount`: `[{ id: "2026-10-05", votes: 5 }]`.
  - `Group_by_pk` with its `proposals` and `members` relation fields resolves correctly.
  - All of this matches the independent on-chain reconstruction logged above, so the indexer, schema,
    and handlers are correct, not just internally consistent.
- **`_aggregate` fields are not exposed** on this Hasura instance (confirmed by introspecting
  `__schema.queryType.fields`: no `Group_aggregate` etc). `docs/FRONTEND.md` is updated: the four
  global totals use the contract's own `getTotals()` (exact, no indexer lag), and GraphQL is used
  for `DailyVoteCount` and relational queries, which the contract cannot give.
