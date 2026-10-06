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

## Server-side data proxy for the Envio rate limit (2026-10-05)

- **Reason.** The hosted Envio indexer's free plan caps the whole project at 100 queries/minute,
  shared across every visitor. A browser calling Envio directly could exhaust that on its own, and
  would also require `NEXT_PUBLIC_ENVIO_GRAPHQL_URL`, exposing the endpoint to anyone.
- **Fix:** `src/app/api/data/{group,proposal,member}/[id]` and `/votes-per-day` proxy the four
  `docs/FRONTEND.md` queries server-side, each with a short in-memory TTL cache keyed by entity id
  (10s for group/member/votes-per-day, 5s for proposal since its results are live). The Envio URL
  lives only in the server env var `ENVIO_GRAPHQL_URL` (not `NEXT_PUBLIC_`), so the browser never
  sees it and cannot call Envio directly.
- **Cache is per server instance**, same tradeoff as the relayer's rate limiter (`src/lib/relay/limits.ts`):
  no shared store, so a cold instance starts with an empty cache. Fine at this traffic scale; a hard
  global cap would need shared storage, which is not built.
- **`docs/FRONTEND.md` updated**: Monse calls `/api/data/*`, never the Envio endpoint directly.

## Hosted Envio verified; production deploy bug found and fixed (2026-10-05)

- **Hosted indexer** at `https://indexer.dev.hyperindex.xyz/4c1d9a7/v1/graphql` (Envio Development
  plan, deployed from the `envio` branch, commit `8b84b2b`). Queried it directly and confirmed it
  returns exactly the Phase 3 record: 3 groups, 9 members, 3 proposals (`voteCount` 1, 2, 2;
  `optionCounts` `[1,0]`, `[1,1]`, `[1,1]`), 5 votes, `DailyVoteCount` `[{ "2026-10-05": 5 }]`.
- **`ENVIO_GRAPHQL_URL` set for Vercel Production only** (not Preview, not `NEXT_PUBLIC_`), the same
  way as the relayer key: piped via stdin into `vercel env add`, never printed or logged.
- **Production build broke on the first redeploy attempt**: `indexer/src/EventHandlers.ts` failed
  type-checking with implicit-`any` errors on `event`/`context`. Cause: the root `tsconfig.json`'s
  default `include` (`**/*.ts`) was sweeping up `indexer/` too, same as it would have for
  `contracts/` if that hadn't already been excluded. `indexer/src/EventHandlers.ts` depends on the
  `declare module "envio"` ambient types generated into `indexer/.envio/types.d.ts` by
  `envio codegen` — correctly gitignored as generated output, so a fresh clone (Vercel's build, or
  any clone that hasn't run codegen) doesn't have it, and the ambient augmentation never loads.
  Fixed by adding `indexer` to the root tsconfig's `exclude`. Verified the fix against a fresh clone
  with no `indexer/.envio` present (matching Vercel's exact condition) before redeploying, not just
  by trusting a green local build.
- **Production redeploy succeeded**, aliased to `https://votalo-six.vercel.app`. Verified the
  `/api/data/*` routes return the real data: `votes-per-day` → `DailyVoteCount` for 2026-10-05 = 5;
  `group/:id` → `Club e2e`, 3 members, its proposal; `proposal/:id` → `voteCount: 1,
  optionCounts: [1,0]`. An invalid id correctly returns 400. `/test-passkey` and the relay routes
  still work after the redeploy.

## Frontend foundation (2026-10-05)

- **Stack.** Tailwind CSS v4 (tokens as CSS variables in `src/app/globals.css`), Radix primitives for the
  sheet, accordion and (later) dropdown, written as small shadcn-style components in
  `src/components/ui` (no shadcn CLI, so no `components.json`). Motion for animation, next-intl,
  next-themes, lucide-react, qrcode.react.
- **Node 22.** The local machine runs Node 22.23; the brief asks for 24 LTS. Lint, tsc, tests and the build
  pass on 22.
- **i18n routing.** next-intl with `localePrefix: "as-needed"`: Spanish at `/`, English at `/en/...`. Pages
  stay statically prerendered (`generateStaticParams` + `setRequestLocale`). A browser that asks for English
  is sent to `/en` by Accept-Language detection; everyone else gets Spanish. `src/proxy.ts` is the Next 16
  name for middleware. `src/app/[locale]/test-passkey` moved under the locale folder (a root layout needs
  every route inside it); it is still marked for removal.
- **Contrast.** Checked with a WCAG script. Everything in the brief's palette passes AA for text except
  two cases, handled with extra tokens: light-theme success green `#0E8F66` is only 3.4–4.1:1 on light
  surfaces, so text uses `--success-text` `#09684A` (5.4–6.5:1) and the brighter green stays for icons and
  fills; light accent orange `#FF9F1C` is 1.9:1 on the light background, so it is only used as a button fill
  (button text is `#1A1206`, 9.0:1) and never as a thin line or text.
- **Option colours.** Six ring colours (`--seg-1..6`) alternate light and dark steps (light theme L\* 15–61,
  dark theme L\* 53–92) and every option also carries a letter chip (A to F) and its count and percent as
  text, so colour is never the only cue. Light-theme segments are at least 3:1 on white.
- **Hold to vote.** About 0.9 s with a pointer. Keyboard and screen-reader activation (a click with
  `detail === 0`) votes immediately, because holding a key is not reliable for everyone. This is an
  assumption; revisit if the spec wants a hold on every input.
- **Mock data.** Chain reads and live stats are real (`/api/stats` wraps `getTotals()` with a 30 s cache and
  returns 503 on failure, which the UI shows as a dash). The landing demo is clearly labelled as an example
  and saves nothing. Per-group data (group, proposals, members) stays mock until Phase 4 GraphQL lands.
- **Proposal URL.** `/g/<groupId>/p/<proposalId>`: the vote flow needs both ids, and proposal titles are not
  stored on chain (only hashes), so they come from the indexer later.

## Vote flow, onboarding and shell (2026-10-05)

- **Mock data layer.** `src/data/` holds the types (shaped like docs/FRONTEND.md), a localStorage store, an
  example group, and `actions.ts`. The actions run the real passkey prompt (so the per-group member address
  is genuine) and record the outcome in this browser. Each action throws `RelayClientError` with the same
  codes the relay returns, so error handling does not change when the real flows replace them. Swap points
  are the bodies of `joinGroup`, `castVote`, `createGroup`, `createProposal` in `src/data/actions.ts`.
- **Needs from `src/lib` (to raise as an issue):** proposal and group text (title, options, group name) is
  not on chain, only hashes, so the screens need the Phase 4 indexer to show real proposals from a shared
  link. Until then a shared link only resolves for the example group and for content created in the same
  browser.
- **Mera error detection.** `src/components/errors.ts` checks `error.name === "MeraError"` instead of
  importing Mera, because it is also used on the landing page and Mera's crypto code would add to that
  page's JavaScript. `isPrfUnavailable` in `src/lib/identity/passkey.ts` stays the source of truth for
  onboarding flows that already import Mera.
- **Locale proxy matcher.** `src/proxy.ts` must keep `\.` (escaped dot) in the matcher string. With a single
  backslash every path except `/` skips the proxy and 404s.
- **Lighthouse (mobile, production build, local).** Performance 88–89, accessibility 100, best practices 96,
  SEO 100, CLS 0, TBT about 110 ms. Performance is just under the 90 target. The unthrottled LCP is about
  0.4 s; Lighthouse's simulated LCP stays at 3.6 s regardless of font display, animation and bundle changes
  tried so far. Open item: re-measure on the Vercel preview, which serves from a CDN.
- **Testing passkeys without a phone.** Headless Chrome with a CDP virtual authenticator (`hasPrf: true`)
  drives the real create, join and vote flow. With `hasPrf: false` it triggers the PRF-unavailable screen.
  A real phone check is still required before delivery.

## App screens and live data (2026-10-05)

- **The browser never calls the indexer.** Every read goes to the server-side proxy on main
  (`/api/data/group|proposal|member/:id` and `/api/data/votes-per-day`, see docs/FRONTEND.md), which holds
  `ENVIO_GRAPHQL_URL` (server-only) and caches for 5 to 10 s. The client code in `src/data/api.ts` has no
  indexer address and no GraphQL, and there is no `NEXT_PUBLIC_` variable for it. Polling
  (`src/data/remote.ts`) runs only while the tab is visible and never faster than every 5 s, including the
  reloads after an action (now, then after about 5.5 s and 11 s). Intervals per screen: proposal 6 s, group
  10 s, member 12 s, groups list 15 s, votes per day 30 s.
- **One switch for real data, decided by the server.** `GET /api/data-mode` (added here, a few lines)
  answers `{ live: Boolean(process.env.ENVIO_GRAPHQL_URL) }` and never calls the indexer, so it costs
  nothing against the indexer's quota. `live`: screens read the proxy and actions are the real flows in
  `@/lib/flows/votalo`. Otherwise (the proxy answers 503 `ENVIO_NOT_CONFIGURED`) the screens run on local
  example data, and the actions run the real passkey prompt but only record the result in this browser. If
  the mode check itself fails, screens show a retry and actions fail with a network error. They never assume
  `local`, because that would record a vote in this browser that never reaches the group.
- **The proxy selects fewer fields than I first queried**, so: the group's mode and admin come from the
  group route (the proposal page fetches both routes); the member route returns titles only, so the standing
  page looks up each vote's option text through the proposal route; a proposal's `createdAt` is not
  available and not used. The groups list makes one proxied request per group, since there is no
  list-by-ids route.
- **Which groups are "mine".** The member address per group comes from a passkey prompt, so it is cached in
  this browser (`votalo.ui.v2`) when a member creates or joins a group. A new device with the same synced
  passkey sees no groups until the member opens a group link and acts in it. Showing them without a prompt
  would need a way to list groups by passkey, which the per-group design rules out on purpose.
- **Indexer lag.** Things created here and not yet indexed (groups, votes created) are shown from the local
  cache and merged by id. A vote counts on top of the shown total until the total passes the total at the
  moment of the vote (`baseline`), so it is never counted twice.
- **Invite links.** `/g/<groupId>?i=<inviteId>&s=<signature>`. An invite-only group made by this member
  creates a fresh single-use invite each time they tap "Invite people" (one passkey prompt). Without an
  invite in the link, a non-member of an invite-only group is told how to get one instead of seeing a join
  button that cannot work. The language switch keeps the query string.
- **Text limits are in bytes.** The contract limits names, titles and options by bytes, so the forms count
  bytes (an "n with tilde" or an emoji is more than one).
- **New vote durations** are presets (1 hour, 1 day, 3 days, 7 days), well inside the contract's 30 day cap.
- **Stats chart.** One series, so no legend. Days without votes are filled with zeros (the indexer only
  stores days that had a vote), and the range ends today in UTC and covers at least 14 days. A table view and
  keyboard-focusable bars carry the same numbers. Without an indexer the chart is replaced by a note, not by
  made-up data. The four totals come from `getTotals()` through `/api/stats`.
- **404.** A catch-all route sends unknown URLs to a styled not-found page inside the layout.

## CI fix for runner starvation (2026-10-05)

- **Cause confirmed before fixing**: `gh run view` on main run `37366097175` showed `contracts`
  completed success (got a runner) while `app` was cancelled with `runner: null`. Both `push` and
  `pull_request` fired for the same branch push, doubling the queued jobs.
- **Fix** (`.github/workflows/ci.yml`, commit `b1ca37b`): scope `push` to `branches: [main]` (PRs are
  already covered by `pull_request`); add `concurrency: { group: ci-${{ github.ref }},
  cancel-in-progress: true }` so a newer push cancels a stale run instead of queuing alongside it;
  add `timeout-minutes: 15` to both jobs so a genuinely hung job fails clearly.
- **Verified the fix works**: in run `37370100140` (after the fix), the `app` job got a runner and
  passed. Previously it never did.
- **Separate, unrelated problem found while verifying**: a GitHub-wide Actions incident started
  2026-10-05 19:11 UTC ("delays in assigning GitHub-hosted runners to Actions jobs" — confirmed on
  githubstatus.com), which is why later runs still queued for minutes with `runner: null` after the
  fix was in place. Not caused by this repo's workflow or by the push volume from merging PR #1; it
  should clear once GitHub resolves the incident, with no action needed here.

## Full pages, no dead links, 404 and loading states (2026-10-05)

- **Real pages instead of in-page anchors.** `/how-it-works`, `/privacy`, `/proof` and `/faq` exist in Spanish
  (root) and English (`/en/...`). The navbar, mobile menu, footer and hero link to them, with an active-page
  indicator. The landing keeps short summaries (the three steps, the four privacy points, the proof cards and
  four FAQ questions) that each end in a link to the full page. `/privacy` explains what is visible and what is
  not; the legal privacy notice stays at `/legal/privacy`.
- **Legal texts are written, not placeholders.** `/legal/privacy` and `/legal/terms` describe what the test
  version does today (no accounts, IP seen by the host and the relay, cookies limited to language, public and
  permanent data on Monad, known limits) and carry a last-updated date (`UPDATED` in
  `legal/[doc]/page.tsx`). They name no vendor, only "our hosting provider" and "an indexing service", because
  public text names only Monad. They say they are not legal advice; a lawyer should still review them before
  anything beyond a test version.
- **404 pages.** `experimental.globalNotFound` plus `src/app/global-not-found.tsx`: every address no page claims
  gets a real 404 status and a branded page that is in the server HTML (no JavaScript needed). It cannot know the
  language (it bypasses the layout), so it says the same thing in Spanish and English and links to both home
  pages. Reason: the root layout sits under the dynamic `[locale]` segment, and in that setup Next draws
  `not-found.tsx` only in the browser (the server sends an empty error shell). Malformed ids inside the app
  (`/g/not-an-id`, `/legal/xyz`) use `notFound()` from a layout: the status is a real 404 and the branded page
  (`not-found.tsx` inside the app shell or marketing layout) is drawn by the browser. Hand-typed bad ids are the
  only case that needs JavaScript to show the message.
- **Why ids are checked in layouts and loading files are per route.** A `loading.tsx` makes the page stream, and
  Next then answers 200 for anything that calls `notFound()` inside it. So `g/[groupId]/layout.tsx`,
  `g/[groupId]/p/[proposalId]/layout.tsx` and `legal/[doc]/layout.tsx` validate the id first, and no
  `loading.tsx` sits above them: the group, new vote and standing pages share a `(views)` route group so the
  proposal route is not under the group loading boundary. `route-skeletons.tsx` is a client module on purpose:
  reading messages in a server `loading.tsx` makes next-intl read request headers, which turned every page
  dynamic (all prerendered pages went dynamic until it was fixed).
- **Loading and error states.** Every app route has a `loading.tsx` shaped like its page. `error.tsx` exists for
  the app, the marketing pages and the locale root (plain message, retry, home), and `global-error.tsx` is a
  self-contained bilingual page for the case where the root layout itself fails.
- **Link tests.** `src/links/routes.test.ts` (runs in `npm test`) fails if any internal path written in the source
  does not match a real page route, which also covers links that only appear after a client screen loads.
  `src/links/crawl.test.ts` (run with `npm run build && npm run test:links`) starts the production build, follows
  every internal `<a>` from the home pages and the app routes in both languages, and fails on anything that is not
  200, on a link that switches language, and on an unknown address that is not a branded 404. CI runs it after the
  build. Both were checked to fail on a deliberately broken link.

## Removed the temporary /test-passkey page (2026-10-05)

- **Why.** It was a bare test page for the phone passkey check. The real passkey flow is now
  inside the product at `/create`, which is better evidence than a standalone test page.
- **What was removed.** `src/app/[locale]/test-passkey/page.tsx`. Nothing else referenced it (a
  grep across `src/` found only the file itself).
- **Link test threshold.** `src/links/routes.test.ts` asserted at least 17 pages, which counted the
  test page. It is now at least 16, with a comment pointing here. The required-pages list in the same
  test is unchanged and still passes.
- **Checks run from WSL (Linux, Node 24).** `npm run build`, `npm run test:links` (5 of 5 pass, every
  internal link resolves), `tsc --noEmit`, lint, and the unit tests (27 pass, 6 skipped as expected:
  the testnet-only checks, which need `E2E_BASE_URL`).
- **Why WSL.** On this Windows machine, `@swc/core`'s native loader refuses to load a binary from
  any user-writable directory (a DACL check on the cache root), so `next.config.ts` cannot load and
  the build and link crawler cannot run natively. The same code builds and passes under Linux, which
  is what GitHub Actions and Vercel use.
- **Production.** Redeployed from the clean clone so `votalo-six.vercel.app` stops serving the page;
  see the check recorded below.

## Production deploy also promoted votalo.xyz (2026-10-05)

- Deployed `95a4843` to production with `vercel deploy --prod`. The deploy was aliased to
  `votalo-six.vercel.app` and also to `www.votalo.xyz`, because the domain `votalo.xyz` was added to
  the Vercel project (creator `diximan4-1243`) about 23 minutes before the deploy. Production deploys
  go to every production domain on the project.
- Result: `https://votalo-six.vercel.app/test-passkey` returns 404 (the removal is live).
  `https://votalo.xyz` now returns 200 and serves this build. `www.votalo.xyz` did not resolve yet at check time.
- This was not intended as a go-live. Earlier instructions said not to touch `votalo.xyz` or its DNS.
  No DNS record was changed; the action was the deploy. Decision pending with the user: keep the
  domain live on this build, or detach it from production.

## Accented group names: no encoding bug in the pipeline (2026-10-05)

- **Reported**: a group named "Vótalo Community" appeared as "VÃ³talo Community" on the hosted indexer.
- **Finding**: the bytes are correct at every layer. The hosted indexer stores `56 c3 b3 74 61 6c 6f`
  (V, UTF-8 ó, talo). On chain, the `GroupCreated` event data is `0x11` (17 bytes) followed by the same
  UTF-8 bytes. `VÃ³talo` is exactly what those UTF-8 bytes look like when read as Latin-1 or Windows
  cp1252, which is how the report was displayed, not how the data is stored.
- **Round trip tested** with a fresh group named "Vótalo Ñandú Éxito Íntimo Ópera Úrsula Mañana" (all six
  accents), through the production relay: signed on the client, sent to `/api/relay/create-group` as UTF-8
  JSON, checked on chain (name hash equals keccak256 of the UTF-8 bytes), then read back from the hosted
  indexer as the exact same string. Tx `0x7262b83d847cd2f1e7ccaa0905412fa2405b3b81423f6ebcf8a8f1ff6aba4dbb`,
  group `0x0bf9b403aaa22f89dfa951fa371ccb34e43ea02d122edae5454fb997365b086f`.
- **UI layer**: `/api/data/group/:id` returns UTF-8 (`application/json`, `c3b3` present in the bytes), and
  localized HTML pages are served as `text/html; charset=utf-8`.
- **Tests added**: `src/lib/relay/encoding.test.ts` (CI, offline: a UTF-8 round trip keeps the digest the same, and
  a Latin-1 mis-decode would change it) and `src/lib/relay/accents.testnet.test.ts` (gated, runs only with
  `E2E_BASE_URL` and `ENVIO_GRAPHQL_URL`, creates one testnet group per run).
- **How to read the bytes correctly**: use `curl -s ... | jq` in a UTF-8 terminal, or inspect the hex. The
  Windows PowerShell default (cp1252) displays UTF-8 bytes as Latin-1, which is what produced "VÃ³talo".

## Embeddable widget and framing policy (2026-10-05)

- **What it is.** `/embed/p/<proposalId>` (Spanish at the root, English at `/en/embed/p/<id>`) is a read-only
  view of one proposal meant for an `<iframe>` on any website: title, options, live results in the living
  ring, time left, one "Votar en Votalo" button that opens the full proposal page in a **new tab**, and a small
  "Impulsado por Votalo · Monad" line that links to the site. No navbar or footer. `?theme=dark|light`
  (default dark) scopes the colour tokens to the widget (`.force-light` or `.dark` on its wrapper), so it looks
  right whatever theme the visitor saved for Votalo itself. It is `noindex`.
- **No voting inside the frame.** Passkeys (WebAuthn) do not work reliably inside third-party iframes: browsers
  require extra permissions and policies for it and several block it. So voting always happens on votalo, in a
  top-level tab, where it is known to work. The widget has no vote controls at all.
- **Framing policy.** Only `/embed/*` may be framed by other sites (`Content-Security-Policy: frame-ancestors *`).
  Every other response, including pages, the app, API routes and 404s, sends `frame-ancestors 'self'`. The rules
  live in `src/security/frame-headers.ts` and are applied from `next.config.ts` `headers()`; the embed rules come
  last because Next keeps the last matching rule for a header. The reason for the split: framing the app that
  handles passkeys and votes would open it to clickjacking (a transparent frame over a hostile page tricking a
  member into holding the vote button). The widget has nothing to click except a link out, so there is nothing
  to hijack there. **`X-Frame-Options` is deliberately not set anywhere**: it cannot say "any site", and where
  both headers are present some browsers apply it too, which would block the widget. CSP `frame-ancestors` is
  supported by every current browser. The 404 of a bad widget id is also frameable, so the message shows inside
  the frame.
- **Data.** Only `/api/data/proposal/:id`, never the indexer. The page reads it on the server by calling that
  route's own handler (same cache and limits, no network hop, no indexer address in this code) so results appear
  on first paint; the browser then polls the same route every 6 s while the tab is visible (the shared
  `useRemote` rule: never faster than 5 s, nothing while hidden). If the data service is not configured or cannot
  answer, the page still renders and the browser shows a retry state instead of a wrong number.
- **404.** A malformed id, or an id the data route says does not exist, answers with status 404 and the widget's
  own small not-found state. As with the app's other 404s, Next draws that state in the browser (the root layout
  sits under `[locale]`), which is fine inside an iframe. When the data service cannot answer, the status stays
  200 and the browser shows the retry state, because "cannot tell" is not "does not exist".
- **Language.** The proxy skips browser-language detection for `/embed`, so the language is whatever the URL
  says (the site that embeds it chose it). Without that, a visitor's browser would redirect an embedded Spanish
  widget to the English one.
- **Share sheet.** Proposal pages have an "Insertar en tu sitio" / "Embed on your site" option that copies the
  snippet: `<iframe src="<site>/embed/p/<id>" title="Votalo" width="100%" height="420"
  style="border:0;border-radius:16px" loading="lazy"></iframe>`. The `title` attribute is the one addition to the
  requested snippet: frames without a title fail basic accessibility checks. The `src` uses the current site's
  address and language (Spanish at the root, `/en/...` in English).
- **Tests.** `src/security/frame-headers.test.ts` checks the rules and their order. The crawler (`npm run
  test:links`, also in CI) checks live responses: `/embed/*` (both languages, theme, and its 404) allows
  framing and sends no `X-Frame-Options`; pages, app routes, API routes and a 404 do not allow it; the widget has
  no navbar or footer and honours `?theme=light`; both languages are reachable; a malformed id is a 404. Against
  a server with a real indexer the example id does not exist, so set `CRAWL_EMBED_ID` to a real proposal id.
  Also checked by hand in a real browser from another origin: the widget loaded in an iframe, and the browser
  itself refused to frame `/groups` and `/`.

## Final domain: passkey RP id, site URL, old-host redirect (2026-10-05)

- **Passkey RP id** `NEXT_PUBLIC_RP_ID=votalo.xyz` (Vercel Production). It is the registrable domain, so
  passkeys work on both `votalo.xyz` and `www.votalo.xyz`. Before this, the fallback bound new passkeys to
  whichever host served the page, so `www.votalo.xyz` would have produced a passkey bound to `www.votalo.xyz`.
- **Passkeys created on `votalo-six.vercel.app` are bound to that host and will not carry over.** These are
  test identities only. This is expected. Also, a `*.vercel.app` origin cannot use the `votalo.xyz` RP id, so
  passkey creation no longer works on preview or old hosts at all. The old host now redirects to the final
  domain (below), so those test identities are not reachable from anywhere.
- **Site URL** `NEXT_PUBLIC_SITE_URL=https://www.votalo.xyz` (Vercel Production). It sets `metadataBase`
  (og:url, og:image) in `src/app/[locale]/layout.tsx`. Share links and embed snippets now use it too
  (`src/components/share/share-sheet.tsx`), so they never use `window.location.origin`, which would be
  whatever host the viewer is on.
- **Old host redirect.** `next.config.ts` `redirects()` sends `votalo-six.vercel.app/<path>` to
  `https://www.votalo.xyz/<path>` with a permanent (308) status, keeping the path and query. It is scoped to
  that host, so preview deployments are unaffected.
- **No hardcoded `vercel.app` or `votalo.xyz` host remains in `src/`, the README, or the frontend doc.**
  `docs/SPEC.md` keeps the domain as a spec fact, and that file is not app output.

- **Verified after the final deploy** (commit `c679d57`, production on `www.votalo.xyz`):
  - Passkey: a virtual authenticator with PRF enabled, driven through headless Chrome over CDP, created a
    passkey on `https://www.votalo.xyz/en/start`. The credential is bound to RP id `votalo.xyz`, and onboarding
    completed on `/en/groups`. This is a virtual authenticator, not a real phone, so a phone check is still
    needed before delivery.
  - Metadata: `https://www.votalo.xyz/en` has `og:url` = `https://www.votalo.xyz/en`. A proposal page has `og:url`
    pointing at its own URL and an `og:image` under `https://www.votalo.xyz/`.
  - Redirect: `https://votalo-six.vercel.app/en/stats?x=1` → `308` to `https://www.votalo.xyz/en/stats?x=1`.
    Path and query are kept.

## Real-device gate: PASSED (2026-10-05)

- **Gate:** passkey create and sign-in on a real phone, end to end, on the final domain.
- **Result:** the user created a group "Open" on `https://www.votalo.xyz` from their phone, with a real
  passkey bound to RP id `votalo.xyz`. They shared the link, a second person joined from their own device,
  and both voted on "Vótalo.xyz Will win the metrópolis hackathon?" (Yes: 2 votes).
- **On-chain check** (read-only, `cast call` on `0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072`, Monad testnet):
  `totalGroups` = 8, `totalMembers` = 17, `totalProposals` = 4, `totalVotes` = 7. These match the hub's
  verification. Accented group names were stored correctly.
- **Desktop without PRF:** a desktop browser without PRF support showed the "can't create your passkey" screen
  with the QR code, as designed.
- **Still open before delivery:** remove `src/app/[locale]/test-passkey` (already removed in `95a4843`);
  Lighthouse on the deployed site.

## Share metadata and brand files (2026-10-05)

- **What was wrong in production** (checked against `www.votalo.xyz` before changing anything): no `og:image` on
  any marketing or app page while `twitter:card` was `summary_large_image`; `og:url` was `…/es` on every page
  (the layout hard-coded `/${locale}`, which is also the wrong shape: Spanish is at the root); no canonical link
  and no language alternates; and on proposal pages the image URL Next emits (`/es/g/…/opengraph-image-…`)
  answered **307**, not 200, because the language proxy redirects `/es/...` to `/...`.
- **One helper for every page.** `src/seo/metadata.ts` `pageMetadata({ locale, path, title })` returns the title,
  description, canonical, `alternates.languages` (`es`, `en`, and `x-default` pointing at Spanish), and the Open
  Graph and Twitter cards. The canonical and `og:url` are built from the same string, so they cannot disagree.
  Addresses come from `getPathname` (Spanish at the root, English under `/en`, never `/es`) and
  `NEXT_PUBLIC_SITE_URL` (`src/seo/site.ts`). The layout now only sets defaults and no `og:url`, so a page that
  forgot the helper has no `og:url` instead of a wrong one.
- **Share images are plain routes, not the `opengraph-image` file convention**, so their URLs are ours and return
  200 directly: `/og/es.png` and `/og/en.png` (1200x630, prerendered at build) and
  `/og/proposal/<locale>/<proposalId>.png` (drawn on request). The `.png` at the end keeps them out of the
  language proxy. The cards use the Plaza palette, the logo, the hero line from the messages ("Decidan juntos. Que
  nadie haga trampa." / "Decide together. No one gets to cheat.") and a decorative living ring. **The ring never
  shows numbers**: a card is cached by whoever receives it, and a count on it would go stale.
- **Real names in previews.** A proposal page's title and card show the real question, and a group page's title
  is the group name, because that is what people see in the chat. They are read through the same handlers that
  serve `/api/data/*` (`src/seo/data.ts`: same cache, no indexer address, 2.5 s limit) and fall back to a generic
  title when the data service cannot answer. A card with the real question is cached for a day, the generic one
  for five minutes, so a failed read heals quickly.
- **Brand font in the cards.** Bricolage Grotesque (600 and 800, latin) lives in `src/seo/fonts/` with its OFL
  license, is read from disk, and is listed in `outputFileTracingIncludes` so the deployed function that draws
  proposal cards can find it. (Loading it with `fetch(new URL(..., import.meta.url))` works only inside Next's
  image file convention and failed the build here.)
- **Test.** `src/links/share-metadata.test.ts` (run by `npm run test:links`, or against any server with
  `CRAWL_BASE_URL`): for 17 pages in both languages it checks `og:url` = canonical = the page's own address,
  nothing under `/es`, the `es`/`en`/`x-default` alternates, `twitter:image` = `og:image`, one origin across the
  tags, and that each image is a real 200 `image/png` of 1200x630. It fails on the pre-fix production.
- **Brand files** in `public/brand/`: the mark and the logo with its name as SVG (wordmark as outlines, so no
  font is needed), each for light and dark backgrounds, plus the mark as transparent PNGs at 512 and 1024 px
  (the top-left pixel has alpha 0, checked). They use the same geometry as `src/components/brand/logo.tsx`.
  They were generated by a throwaway script (not in the repo: it needs a font-outline library and a browser), so
  if the logo changes, regenerate them. The README links them; it does not state a license for them, because
  that is the owner's decision.

## Lighthouse on production (2026-10-05)

Lighthouse 13.5.0, mobile preset (4x CPU slowdown, simulated 150 ms RTT and 1.6 Mbps), Edge headless, against
`https://www.votalo.xyz`, 5 runs per page, on a machine with nothing else running.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | median 93 (runs 93, 92, 93, 94, 77) | 100 | 100 | 100 |
| `/create` | median 95 (runs 95, 94, 95, 93, 95) | 100 | 100 | 100 |

FCP 1.1–1.3 s, TBT 125–140 ms, CLS 0, on both pages.

- **Targets met** on the median. Accessibility, best practices and SEO are 100 in every run. Performance is above
  90 on the median but not in every run: one of five runs on `/` scored 77, and a first batch that overlapped
  with other work on the same machine scored 82 (TBT 480 ms instead of 125 ms). Single runs swing by 10+ points
  with CPU contention, so the numbers above are medians of runs taken on an idle machine, not a promise per run.
- **Baseline before today's changes** was the same (median 93 on `/`, 94 on `/create`), so the share metadata,
  the brand files and the copy pass did not move performance.
- **What the remaining findings are.** LCP is about 3 s in the simulation. A filmstrip of the same load shows the
  page visually complete at about 750 ms: the 3 s comes from Lighthouse's simulated font and CSS request chain,
  not from a late element. "Legacy JavaScript" (14 KiB) is Next's own polyfill module, which the app cannot
  remove. "Unused JavaScript" on `/create` is the `motion` chunk, which Next prefetches there for the next screen.
- **Tried and not kept.** `inlineCss: true` (no gain on a local build, reverted). Loading Geist Mono without
  preload (`preload: false`, kept: it is harmless and the mono font is only used for ids and numbers).
- **Not done.** Moving the animation components to motion's `LazyMotion` and `m` would trim the bundle somewhat
  (not measured). It touches every animated component close to the freeze, for a modest gain on a
  page that already meets the target, so it is left out.
- **Re-check after any change** with 5 runs and compare medians, never single runs.

## Final QA pass (2026-10-05)

- **What was run.** A phone-sized browser (390x844, touch, 2x, a virtual passkey with PRF) against a production
  build in local mode, in Spanish and English, dark and light (4 runs of each script): create a group
  (invite-only), open the share sheet (WhatsApp link prefilled, invite link with signature, QR), group page, new
  vote (duplicate options blocked), hold to vote, the ring and bars update, "my standing", Me, Groups, Stats,
  About and the branded 404; and, on the example group, create passkey, join, hold to vote, result, reload keeps
  the vote locked. The unsupported-browser screen (QR, supported and unsupported lists) was checked with a
  passkey that has no PRF. No script failed, no page threw an error and no page scrolled sideways.
- **What was not done, and why.** No physical phone was used in this pass, and a second device joining a group
  was not exercised: in local mode a group exists only in the browser that made it, and doing it live would
  write new records to the real contract. The real-phone check (create on a phone, a second person joins, both
  vote) is the one recorded as passed above.
- **Honesty rules checked in the text.** Votes are described as visible under the voter's credential and the
  record as public (privacy summary, privacy page, FAQ, About, legal). The device list names iPhone with iOS 18+
  (Safari or Chrome), Android with Chrome, desktop Chrome with Google Password Manager or 1Password, and Windows
  11 25H2+, and says the desktop Chrome local profile, Bitwarden and Dashlane do not work. The hero demo is
  labelled as an interactive example. Stats show numbers read from the contract, and a message instead of a
  chart when the data service is not connected.
- **Known wording choice.** The copy uses "fingerprint" for the passkey as a metaphor and says in the same
  places that Face ID or the phone's PIN work too; the confirm prompts say "your fingerprint" even when the
  person uses Face ID or a PIN.

## Brand pack page and one logo (2026-10-05)

- **The page.** The brand pack made by the Monad team from our logo is published as a static folder:
  `public/branding-votalo/` (page, README, full ZIP, SVG, PNG), served at `/branding-votalo`. It is one page for
  both languages (it has its own ES/EN toggle), so it has no `/en` version and the footer link ("Marca" /
  "Brand") is a plain `<a href="/branding-votalo">`, not the localized `Link`. The files were not edited.
- **How it is wired.** `next.config.ts` rewrites `/branding-votalo` (and the slash form) to the folder's
  `index.html`; `src/proxy.ts` excludes `branding-votalo` from the language matcher, otherwise the proxy would
  redirect it to a locale route. With a trailing slash Next answers its usual 308 to the slash-less address,
  never to a language. No Content-Security-Policy change was needed: the only policy the site sends is
  `frame-ancestors`, so the page's inline script and styles are not blocked.
- **Crawler.** It now honours `<base href>` (the page's relative links only resolve against it) and does not
  count a link to `/branding-votalo` as a language switch. The static link test allows that one static path.
  `crawl.test.ts` checks the page, its downloads, the ZIP content type and the no-redirect behaviour.
- **One logo.** The pack's mark has real gaps between the arcs. `logo.tsx` and the share-card mark
  (`src/seo/og.tsx`) now use its geometry: each arc is shortened by 4.6 (was 3) and the next arc starts 2.6
  later (was 1). Both numbers matter: the gap between arcs is their sum minus the round caps, so changing only
  the first would leave the arcs 1.6 closer than the pack's. The files in `public/brand/` were replaced by
  the pack's (mark and lockup SVGs, mark PNGs at 512 and 1024, light and dark), keeping their names so the README
  table and any links keep working. The PNG corners have alpha 0 (checked).

## Encrypted group vault (2026-10-05)

- **Problem solved**: "your groups" lived only in one browser's `localStorage`. On a new device the
  passkey syncs, but the group ids were unreachable, so per-group identities were orphaned.
- **Two new PRF salts**, separate from `groupPrfSalt` (`identity/groupSalt.ts`):
  `keccak256("votalo/vault/v1")` for the AES key, `keccak256("votalo/vault-id/v1")` for the lookup id.
  Mera's PRF API takes one salt per ceremony (checked its types directly: no multi-salt option), so the
  two values need two separate assertions, not one.
- **Prompt count, by design**: the vault id is cached in `localStorage` after the first time it is
  derived (safe: it is an opaque lookup name, not a secret — it reveals nothing without the vault key,
  which is never cached). So `saveVault` needs one prompt on a device that has saved before, and two the
  very first time. `restoreVault` (a new device, nothing cached) always needs two. Documented in
  `docs/FRONTEND.md` so the "Restore my groups" button Monse builds can set expectations correctly.
- **Vault key**: HKDF-SHA256(PRF output, info `votalo-vault-aes-v1`) → **non-extractable** AES-256-GCM
  `CryptoKey` (WebCrypto `deriveKey`, not `deriveBits`), so the raw key bytes never exist in JS memory.
- **Vault id**: HKDF-SHA256(PRF output, info `votalo-vault-id-v1`) → 64-char hex string.
- **Encryption**: fresh random 12-byte IV per write (`crypto.getRandomValues`), AES-GCM, stored as
  `{ iv, ciphertext }` (base64). The server never sees plaintext, the PRF output, or any key — confirmed
  by a test that the PUT handler stores exactly those two JSON keys.
- **Storage: Vercel Blob**, private access (not public — reads need the server's token, not just a
  guessable URL; double protection on top of AES-GCM). Store `votalo-vault` created via
  `vercel blob create-store votalo-vault --access private`; `BLOB_READ_WRITE_TOKEN` is a server-only env
  var, auto-injected once linked to the project. Pathname `vault/<vaultId>.json`, `addRandomSuffix:
  false` (the vault id is already a 256-bit opaque value, so no extra randomness is needed) and
  `allowOverwrite: true` (a PUT replaces the previous save).
- **Route** `PUT`/`GET /api/vault/:vaultId`: 16 KB body cap, per-IP and per-vault-id rate limits
  (`vault/limits.ts`, same per-instance tradeoff as the relay's). The handler logic (`vault/handler.ts`)
  takes its storage as a parameter, so it is unit-tested against an in-memory fake, not real Blob calls.
- **Tests** (`vault/crypto.test.ts`, `vault/handler.test.ts`): round trip; decrypting with the wrong key
  throws (AES-GCM authentication failure); two encryptions of the same content produce different IVs and
  ciphertexts, both still decrypting correctly; the vault id, the vault-key PRF output, and a group's PRF
  output are pairwise unrelated for the same passkey (tested with the same fake-authenticator convention
  as `identity.test.ts`); the server-side handler stores only `{ iv, ciphertext }`; oversized and
  malformed bodies are rejected; the per-vault-id rate limit kicks in.
- **Not yet done**: wiring `saveVault` into the actual create/join flows and a restore button is
  explicitly Monse's work per the frontend contract (`docs/FRONTEND.md`); the library side is complete,
  tested, and documented for her to call.
- **Working-directory note**: this session shares the Votalo checkout with at least one other live
  session (Monse's), which was mid-way through an uncommitted `/pitch` deck page when this work started.
  The sandbox correctly blocked an attempt to `git stash` her uncommitted work, which was the right call —
  that risk belongs to her, not to me. She resolved it herself (a separate `ui/pitch` branch, not yet
  merged to `main`), and nothing of hers was touched or lost. Every commit in this entry was staged by
  explicit file path, never `git add -A`, to keep the two sessions' work from mixing.

## Vault verified live in production (2026-10-06)

- **Vercel Blob store connected** via the dashboard (CLI/API had no non-interactive path to link an
  existing store to a project — confirmed by reading the CLI's own `--help` output and the public REST
  API reference, which only lists get/create/delete for stores, no connect endpoint). `BLOB_READ_WRITE_TOKEN`
  is now set for Production and Preview.
- **Verified end to end against `https://www.votalo.xyz/api/vault/:vaultId`**, not a local or mocked
  server: `PUT` with a real AES-GCM-encrypted payload → `200 {"ok":true}`; `GET` of the same id → `200`,
  body is exactly `{ iv, ciphertext }`; decrypting the returned value with the matching key reproduces
  the original content exactly; `GET` of a vault id that was never written → `404`. The script used the
  same HKDF info strings as `src/lib/vault/crypto.ts`, with a locally generated key/id standing in for a
  real PRF output (no real passkey was used for this check).
- **Not yet done**: a real passkey, on a real device, through the actual UI. That needs `saveVault` and
  `restoreVault` wired into the create/join flows and a restore button, which is Monse's side per
  `docs/FRONTEND.md`.

## Envio: try HyperSync on the hosted deployment, no token (2026-10-06)

- **Reason.** The Envio free plan does not allow custom environment variables, so `ENVIO_API_TOKEN`
  cannot be set for the hosted deployment. Trying HyperSync without a token, relying on whatever
  built-in access the hosted service itself has.
- **`indexer/config.yaml`**: removed `rpc.for: sync`. With no `for:` set, the schema's own default
  applies: `fallback` when HyperSync is available for the chain, so this becomes HyperSync as the
  primary source with RPC as a fallback (kept, with the same 100-block interval cap, in case the
  fallback is ever used).
- **`indexer/config.local.yaml`** (new): the previous RPC-only config, kept so local dev still works
  without a token. Run with `npm run dev -- --config config.local.yaml` (documented in
  `indexer/README.md`). Verified: a fresh local sync with this file reached "The indexer is ready" and
  returned the correct totals (8 groups, 17 members, 4 proposals, 7 votes — matching the contract).
- **Pushed only this change to the `envio` branch** (cherry-picked, not merged, so the branch stays
  focused on the indexer and does not pull in the rest of `main`'s history). `main` keeps the full
  commit as usual.
- **Outcome: pending.** Waiting for the user to check the Envio dashboard for "Source: HyperSync" at
  100%. If it works: switch `ENVIO_GRAPHQL_URL` in Vercel, confirm totals match the contract, verify
  `/api/data/*`. If it fails or still shows RPC: revert `envio` to `8b84b2b`.

## Hosted indexer on HyperSync: production switched (2026-10-06)

- **The hosted service syncs with HyperSync without a token.** Deployment `28e237d` (branch `envio`)
  reached 100% with "Source: HyperSync". No `ENVIO_API_TOKEN` is needed on the hosted service. The
  free plan does not allow custom environment variables, so none could be set anyway.
- **The endpoint URL changes on every indexer redeploy on the free plan.** Each deploy gets a new
  deployment id in the URL. Whenever the indexer redeploys, `ENVIO_GRAPHQL_URL` in Vercel must be
  updated to match, and the production app redeployed.
- **Current endpoint**: `https://indexer.dev.hyperindex.xyz/9e5a8ae/v1/graphql`. Verified directly
  against the contract: 8 groups, 17 members, 4 proposals, 7 votes. `DailyVoteCount`:
  `2026-10-05: 5`, `2026-10-06: 2`.
- **Production switched and verified**: `ENVIO_GRAPHQL_URL` set for Vercel Production, redeployed,
  `/api/data/votes-per-day`, `/api/data/group/:id` and `/api/data/proposal/:id` return the same data
  as the RPC-synced deployment did.
- **Previous deployment `8b84b2b` (RPC-synced, `4c1d9a7`)** can now be deleted. Production no longer
  reads from it.
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

## Server-side data proxy for the Envio rate limit (2026-10-05)

- **Reason.** The hosted Envio indexer's free plan caps the whole project at 100 queries/minute,
  shared across every visitor. A browser calling Envio directly could exhaust that on its own, and
  would also require `NEXT_PUBLIC_ENVIO_GRAPHQL_URL`, exposing the endpoint to anyone.
- **Fix:** `src/app/api/data/{group,proposal,member}/[id]` and `/votes-per-day` proxy the four
  `docs/FRONTEND.md` queries server-side, each with a short in-memory TTL cache keyed by entity id
  (10s for group/member/votes-per-day, 5s for proposal since its results are live). The Envio URL
  lives only in the server env var `ENVIO_GRAPHQL_URL` (not `NEXT_PUBLIC_`), so the browser never
  sees it and cannot call Envio directly.
- **Cache is per server instance**, same tradeoff as the relayer's rate limiter (`src/lib/relay/limits.ts`):
  no shared store, so a cold instance starts with an empty cache. Fine at this traffic scale; a hard
  global cap would need shared storage, which is not built.
- **`docs/FRONTEND.md` updated**: Monse calls `/api/data/*`, never the Envio endpoint directly.

## Hosted Envio verified; production deploy bug found and fixed (2026-10-05)

- **Hosted indexer** at `https://indexer.dev.hyperindex.xyz/4c1d9a7/v1/graphql` (Envio Development
  plan, deployed from the `envio` branch, commit `8b84b2b`). Queried it directly and confirmed it
  returns exactly the Phase 3 record: 3 groups, 9 members, 3 proposals (`voteCount` 1, 2, 2;
  `optionCounts` `[1,0]`, `[1,1]`, `[1,1]`), 5 votes, `DailyVoteCount` `[{ "2026-10-05": 5 }]`.
- **`ENVIO_GRAPHQL_URL` set for Vercel Production only** (not Preview, not `NEXT_PUBLIC_`), the same
  way as the relayer key: piped via stdin into `vercel env add`, never printed or logged.
- **Production build broke on the first redeploy attempt**: `indexer/src/EventHandlers.ts` failed
  type-checking with implicit-`any` errors on `event`/`context`. Cause: the root `tsconfig.json`'s
  default `include` (`**/*.ts`) was sweeping up `indexer/` too, same as it would have for
  `contracts/` if that hadn't already been excluded. `indexer/src/EventHandlers.ts` depends on the
  `declare module "envio"` ambient types generated into `indexer/.envio/types.d.ts` by
  `envio codegen` — correctly gitignored as generated output, so a fresh clone (Vercel's build, or
  any clone that hasn't run codegen) doesn't have it, and the ambient augmentation never loads.
  Fixed by adding `indexer` to the root tsconfig's `exclude`. Verified the fix against a fresh clone
  with no `indexer/.envio` present (matching Vercel's exact condition) before redeploying, not just
  by trusting a green local build.
- **Production redeploy succeeded**, aliased to `https://votalo-six.vercel.app`. Verified the
  `/api/data/*` routes return the real data: `votes-per-day` → `DailyVoteCount` for 2026-10-05 = 5;
  `group/:id` → `Club e2e`, 3 members, its proposal; `proposal/:id` → `voteCount: 1,
  optionCounts: [1,0]`. An invalid id correctly returns 400. `/test-passkey` and the relay routes
  still work after the redeploy.

## Frontend foundation (2026-10-05)

- **Stack.** Tailwind CSS v4 (tokens as CSS variables in `src/app/globals.css`), Radix primitives for the
  sheet, accordion and (later) dropdown, written as small shadcn-style components in
  `src/components/ui` (no shadcn CLI, so no `components.json`). Motion for animation, next-intl,
  next-themes, lucide-react, qrcode.react.
- **Node 22.** The local machine runs Node 22.23; the brief asks for 24 LTS. Lint, tsc, tests and the build
  pass on 22.
- **i18n routing.** next-intl with `localePrefix: "as-needed"`: Spanish at `/`, English at `/en/...`. Pages
  stay statically prerendered (`generateStaticParams` + `setRequestLocale`). A browser that asks for English
  is sent to `/en` by Accept-Language detection; everyone else gets Spanish. `src/proxy.ts` is the Next 16
  name for middleware. `src/app/[locale]/test-passkey` moved under the locale folder (a root layout needs
  every route inside it); it is still marked for removal.
- **Contrast.** Checked with a WCAG script. Everything in the brief's palette passes AA for text except
  two cases, handled with extra tokens: light-theme success green `#0E8F66` is only 3.4–4.1:1 on light
  surfaces, so text uses `--success-text` `#09684A` (5.4–6.5:1) and the brighter green stays for icons and
  fills; light accent orange `#FF9F1C` is 1.9:1 on the light background, so it is only used as a button fill
  (button text is `#1A1206`, 9.0:1) and never as a thin line or text.
- **Option colours.** Six ring colours (`--seg-1..6`) alternate light and dark steps (light theme L\* 15–61,
  dark theme L\* 53–92) and every option also carries a letter chip (A to F) and its count and percent as
  text, so colour is never the only cue. Light-theme segments are at least 3:1 on white.
- **Hold to vote.** About 0.9 s with a pointer. Keyboard and screen-reader activation (a click with
  `detail === 0`) votes immediately, because holding a key is not reliable for everyone. This is an
  assumption; revisit if the spec wants a hold on every input.
- **Mock data.** Chain reads and live stats are real (`/api/stats` wraps `getTotals()` with a 30 s cache and
  returns 503 on failure, which the UI shows as a dash). The landing demo is clearly labelled as an example
  and saves nothing. Per-group data (group, proposals, members) stays mock until Phase 4 GraphQL lands.
- **Proposal URL.** `/g/<groupId>/p/<proposalId>`: the vote flow needs both ids, and proposal titles are not
  stored on chain (only hashes), so they come from the indexer later.

## Vote flow, onboarding and shell (2026-10-05)

- **Mock data layer.** `src/data/` holds the types (shaped like docs/FRONTEND.md), a localStorage store, an
  example group, and `actions.ts`. The actions run the real passkey prompt (so the per-group member address
  is genuine) and record the outcome in this browser. Each action throws `RelayClientError` with the same
  codes the relay returns, so error handling does not change when the real flows replace them. Swap points
  are the bodies of `joinGroup`, `castVote`, `createGroup`, `createProposal` in `src/data/actions.ts`.
- **Needs from `src/lib` (to raise as an issue):** proposal and group text (title, options, group name) is
  not on chain, only hashes, so the screens need the Phase 4 indexer to show real proposals from a shared
  link. Until then a shared link only resolves for the example group and for content created in the same
  browser.
- **Mera error detection.** `src/components/errors.ts` checks `error.name === "MeraError"` instead of
  importing Mera, because it is also used on the landing page and Mera's crypto code would add to that
  page's JavaScript. `isPrfUnavailable` in `src/lib/identity/passkey.ts` stays the source of truth for
  onboarding flows that already import Mera.
- **Locale proxy matcher.** `src/proxy.ts` must keep `\.` (escaped dot) in the matcher string. With a single
  backslash every path except `/` skips the proxy and 404s.
- **Lighthouse (mobile, production build, local).** Performance 88–89, accessibility 100, best practices 96,
  SEO 100, CLS 0, TBT about 110 ms. Performance is just under the 90 target. The unthrottled LCP is about
  0.4 s; Lighthouse's simulated LCP stays at 3.6 s regardless of font display, animation and bundle changes
  tried so far. Open item: re-measure on the Vercel preview, which serves from a CDN.
- **Testing passkeys without a phone.** Headless Chrome with a CDP virtual authenticator (`hasPrf: true`)
  drives the real create, join and vote flow. With `hasPrf: false` it triggers the PRF-unavailable screen.
  A real phone check is still required before delivery.

## App screens and live data (2026-10-05)

- **The browser never calls the indexer.** Every read goes to the server-side proxy on main
  (`/api/data/group|proposal|member/:id` and `/api/data/votes-per-day`, see docs/FRONTEND.md), which holds
  `ENVIO_GRAPHQL_URL` (server-only) and caches for 5 to 10 s. The client code in `src/data/api.ts` has no
  indexer address and no GraphQL, and there is no `NEXT_PUBLIC_` variable for it. Polling
  (`src/data/remote.ts`) runs only while the tab is visible and never faster than every 5 s, including the
  reloads after an action (now, then after about 5.5 s and 11 s). Intervals per screen: proposal 6 s, group
  10 s, member 12 s, groups list 15 s, votes per day 30 s.
- **One switch for real data, decided by the server.** `GET /api/data-mode` (added here, a few lines)
  answers `{ live: Boolean(process.env.ENVIO_GRAPHQL_URL) }` and never calls the indexer, so it costs
  nothing against the indexer's quota. `live`: screens read the proxy and actions are the real flows in
  `@/lib/flows/votalo`. Otherwise (the proxy answers 503 `ENVIO_NOT_CONFIGURED`) the screens run on local
  example data, and the actions run the real passkey prompt but only record the result in this browser. If
  the mode check itself fails, screens show a retry and actions fail with a network error. They never assume
  `local`, because that would record a vote in this browser that never reaches the group.
- **The proxy selects fewer fields than I first queried**, so: the group's mode and admin come from the
  group route (the proposal page fetches both routes); the member route returns titles only, so the standing
  page looks up each vote's option text through the proposal route; a proposal's `createdAt` is not
  available and not used. The groups list makes one proxied request per group, since there is no
  list-by-ids route.
- **Which groups are "mine".** The member address per group comes from a passkey prompt, so it is cached in
  this browser (`votalo.ui.v2`) when a member creates or joins a group. A new device with the same synced
  passkey sees no groups until the member opens a group link and acts in it. Showing them without a prompt
  would need a way to list groups by passkey, which the per-group design rules out on purpose.
- **Indexer lag.** Things created here and not yet indexed (groups, votes created) are shown from the local
  cache and merged by id. A vote counts on top of the shown total until the total passes the total at the
  moment of the vote (`baseline`), so it is never counted twice.
- **Invite links.** `/g/<groupId>?i=<inviteId>&s=<signature>`. An invite-only group made by this member
  creates a fresh single-use invite each time they tap "Invite people" (one passkey prompt). Without an
  invite in the link, a non-member of an invite-only group is told how to get one instead of seeing a join
  button that cannot work. The language switch keeps the query string.
- **Text limits are in bytes.** The contract limits names, titles and options by bytes, so the forms count
  bytes (an "n with tilde" or an emoji is more than one).
- **New vote durations** are presets (1 hour, 1 day, 3 days, 7 days), well inside the contract's 30 day cap.
- **Stats chart.** One series, so no legend. Days without votes are filled with zeros (the indexer only
  stores days that had a vote), and the range ends today in UTC and covers at least 14 days. A table view and
  keyboard-focusable bars carry the same numbers. Without an indexer the chart is replaced by a note, not by
  made-up data. The four totals come from `getTotals()` through `/api/stats`.
- **404.** A catch-all route sends unknown URLs to a styled not-found page inside the layout.

## CI fix for runner starvation (2026-10-05)

- **Cause confirmed before fixing**: `gh run view` on main run `37366097175` showed `contracts`
  completed success (got a runner) while `app` was cancelled with `runner: null`. Both `push` and
  `pull_request` fired for the same branch push, doubling the queued jobs.
- **Fix** (`.github/workflows/ci.yml`, commit `b1ca37b`): scope `push` to `branches: [main]` (PRs are
  already covered by `pull_request`); add `concurrency: { group: ci-${{ github.ref }},
  cancel-in-progress: true }` so a newer push cancels a stale run instead of queuing alongside it;
  add `timeout-minutes: 15` to both jobs so a genuinely hung job fails clearly.
- **Verified the fix works**: in run `37370100140` (after the fix), the `app` job got a runner and
  passed. Previously it never did.
- **Separate, unrelated problem found while verifying**: a GitHub-wide Actions incident started
  2026-10-05 19:11 UTC ("delays in assigning GitHub-hosted runners to Actions jobs" — confirmed on
  githubstatus.com), which is why later runs still queued for minutes with `runner: null` after the
  fix was in place. Not caused by this repo's workflow or by the push volume from merging PR #1; it
  should clear once GitHub resolves the incident, with no action needed here.

## Full pages, no dead links, 404 and loading states (2026-10-05)

- **Real pages instead of in-page anchors.** `/how-it-works`, `/privacy`, `/proof` and `/faq` exist in Spanish
  (root) and English (`/en/...`). The navbar, mobile menu, footer and hero link to them, with an active-page
  indicator. The landing keeps short summaries (the three steps, the four privacy points, the proof cards and
  four FAQ questions) that each end in a link to the full page. `/privacy` explains what is visible and what is
  not; the legal privacy notice stays at `/legal/privacy`.
- **Legal texts are written, not placeholders.** `/legal/privacy` and `/legal/terms` describe what the test
  version does today (no accounts, IP seen by the host and the relay, cookies limited to language, public and
  permanent data on Monad, known limits) and carry a last-updated date (`UPDATED` in
  `legal/[doc]/page.tsx`). They name no vendor, only "our hosting provider" and "an indexing service", because
  public text names only Monad. They say they are not legal advice; a lawyer should still review them before
  anything beyond a test version.
- **404 pages.** `experimental.globalNotFound` plus `src/app/global-not-found.tsx`: every address no page claims
  gets a real 404 status and a branded page that is in the server HTML (no JavaScript needed). It cannot know the
  language (it bypasses the layout), so it says the same thing in Spanish and English and links to both home
  pages. Reason: the root layout sits under the dynamic `[locale]` segment, and in that setup Next draws
  `not-found.tsx` only in the browser (the server sends an empty error shell). Malformed ids inside the app
  (`/g/not-an-id`, `/legal/xyz`) use `notFound()` from a layout: the status is a real 404 and the branded page
  (`not-found.tsx` inside the app shell or marketing layout) is drawn by the browser. Hand-typed bad ids are the
  only case that needs JavaScript to show the message.
- **Why ids are checked in layouts and loading files are per route.** A `loading.tsx` makes the page stream, and
  Next then answers 200 for anything that calls `notFound()` inside it. So `g/[groupId]/layout.tsx`,
  `g/[groupId]/p/[proposalId]/layout.tsx` and `legal/[doc]/layout.tsx` validate the id first, and no
  `loading.tsx` sits above them: the group, new vote and standing pages share a `(views)` route group so the
  proposal route is not under the group loading boundary. `route-skeletons.tsx` is a client module on purpose:
  reading messages in a server `loading.tsx` makes next-intl read request headers, which turned every page
  dynamic (all prerendered pages went dynamic until it was fixed).
- **Loading and error states.** Every app route has a `loading.tsx` shaped like its page. `error.tsx` exists for
  the app, the marketing pages and the locale root (plain message, retry, home), and `global-error.tsx` is a
  self-contained bilingual page for the case where the root layout itself fails.
- **Link tests.** `src/links/routes.test.ts` (runs in `npm test`) fails if any internal path written in the source
  does not match a real page route, which also covers links that only appear after a client screen loads.
  `src/links/crawl.test.ts` (run with `npm run build && npm run test:links`) starts the production build, follows
  every internal `<a>` from the home pages and the app routes in both languages, and fails on anything that is not
  200, on a link that switches language, and on an unknown address that is not a branded 404. CI runs it after the
  build. Both were checked to fail on a deliberately broken link.

## Removed the temporary /test-passkey page (2026-10-05)

- **Why.** It was a bare test page for the phone passkey check. The real passkey flow is now
  inside the product at `/create`, which is better evidence than a standalone test page.
- **What was removed.** `src/app/[locale]/test-passkey/page.tsx`. Nothing else referenced it (a
  grep across `src/` found only the file itself).
- **Link test threshold.** `src/links/routes.test.ts` asserted at least 17 pages, which counted the
  test page. It is now at least 16, with a comment pointing here. The required-pages list in the same
  test is unchanged and still passes.
- **Checks run from WSL (Linux, Node 24).** `npm run build`, `npm run test:links` (5 of 5 pass, every
  internal link resolves), `tsc --noEmit`, lint, and the unit tests (27 pass, 6 skipped as expected:
  the testnet-only checks, which need `E2E_BASE_URL`).
- **Why WSL.** On this Windows machine, `@swc/core`'s native loader refuses to load a binary from
  any user-writable directory (a DACL check on the cache root), so `next.config.ts` cannot load and
  the build and link crawler cannot run natively. The same code builds and passes under Linux, which
  is what GitHub Actions and Vercel use.
- **Production.** Redeployed from the clean clone so `votalo-six.vercel.app` stops serving the page;
  see the check recorded below.

## Production deploy also promoted votalo.xyz (2026-10-05)

- Deployed `95a4843` to production with `vercel deploy --prod`. The deploy was aliased to
  `votalo-six.vercel.app` and also to `www.votalo.xyz`, because the domain `votalo.xyz` was added to
  the Vercel project (creator `diximan4-1243`) about 23 minutes before the deploy. Production deploys
  go to every production domain on the project.
- Result: `https://votalo-six.vercel.app/test-passkey` returns 404 (the removal is live).
  `https://votalo.xyz` now returns 200 and serves this build. `www.votalo.xyz` did not resolve yet at check time.
- This was not intended as a go-live. Earlier instructions said not to touch `votalo.xyz` or its DNS.
  No DNS record was changed; the action was the deploy. Decision pending with the user: keep the
  domain live on this build, or detach it from production.

## Accented group names: no encoding bug in the pipeline (2026-10-05)

- **Reported**: a group named "Vótalo Community" appeared as "VÃ³talo Community" on the hosted indexer.
- **Finding**: the bytes are correct at every layer. The hosted indexer stores `56 c3 b3 74 61 6c 6f`
  (V, UTF-8 ó, talo). On chain, the `GroupCreated` event data is `0x11` (17 bytes) followed by the same
  UTF-8 bytes. `VÃ³talo` is exactly what those UTF-8 bytes look like when read as Latin-1 or Windows
  cp1252, which is how the report was displayed, not how the data is stored.
- **Round trip tested** with a fresh group named "Vótalo Ñandú Éxito Íntimo Ópera Úrsula Mañana" (all six
  accents), through the production relay: signed on the client, sent to `/api/relay/create-group` as UTF-8
  JSON, checked on chain (name hash equals keccak256 of the UTF-8 bytes), then read back from the hosted
  indexer as the exact same string. Tx `0x7262b83d847cd2f1e7ccaa0905412fa2405b3b81423f6ebcf8a8f1ff6aba4dbb`,
  group `0x0bf9b403aaa22f89dfa951fa371ccb34e43ea02d122edae5454fb997365b086f`.
- **UI layer**: `/api/data/group/:id` returns UTF-8 (`application/json`, `c3b3` present in the bytes), and
  localized HTML pages are served as `text/html; charset=utf-8`.
- **Tests added**: `src/lib/relay/encoding.test.ts` (CI, offline: a UTF-8 round trip keeps the digest the same, and
  a Latin-1 mis-decode would change it) and `src/lib/relay/accents.testnet.test.ts` (gated, runs only with
  `E2E_BASE_URL` and `ENVIO_GRAPHQL_URL`, creates one testnet group per run).
- **How to read the bytes correctly**: use `curl -s ... | jq` in a UTF-8 terminal, or inspect the hex. The
  Windows PowerShell default (cp1252) displays UTF-8 bytes as Latin-1, which is what produced "VÃ³talo".

## Embeddable widget and framing policy (2026-10-05)

- **What it is.** `/embed/p/<proposalId>` (Spanish at the root, English at `/en/embed/p/<id>`) is a read-only
  view of one proposal meant for an `<iframe>` on any website: title, options, live results in the living
  ring, time left, one "Votar en Votalo" button that opens the full proposal page in a **new tab**, and a small
  "Impulsado por Votalo · Monad" line that links to the site. No navbar or footer. `?theme=dark|light`
  (default dark) scopes the colour tokens to the widget (`.force-light` or `.dark` on its wrapper), so it looks
  right whatever theme the visitor saved for Votalo itself. It is `noindex`.
- **No voting inside the frame.** Passkeys (WebAuthn) do not work reliably inside third-party iframes: browsers
  require extra permissions and policies for it and several block it. So voting always happens on votalo, in a
  top-level tab, where it is known to work. The widget has no vote controls at all.
- **Framing policy.** Only `/embed/*` may be framed by other sites (`Content-Security-Policy: frame-ancestors *`).
  Every other response, including pages, the app, API routes and 404s, sends `frame-ancestors 'self'`. The rules
  live in `src/security/frame-headers.ts` and are applied from `next.config.ts` `headers()`; the embed rules come
  last because Next keeps the last matching rule for a header. The reason for the split: framing the app that
  handles passkeys and votes would open it to clickjacking (a transparent frame over a hostile page tricking a
  member into holding the vote button). The widget has nothing to click except a link out, so there is nothing
  to hijack there. **`X-Frame-Options` is deliberately not set anywhere**: it cannot say "any site", and where
  both headers are present some browsers apply it too, which would block the widget. CSP `frame-ancestors` is
  supported by every current browser. The 404 of a bad widget id is also frameable, so the message shows inside
  the frame.
- **Data.** Only `/api/data/proposal/:id`, never the indexer. The page reads it on the server by calling that
  route's own handler (same cache and limits, no network hop, no indexer address in this code) so results appear
  on first paint; the browser then polls the same route every 6 s while the tab is visible (the shared
  `useRemote` rule: never faster than 5 s, nothing while hidden). If the data service is not configured or cannot
  answer, the page still renders and the browser shows a retry state instead of a wrong number.
- **404.** A malformed id, or an id the data route says does not exist, answers with status 404 and the widget's
  own small not-found state. As with the app's other 404s, Next draws that state in the browser (the root layout
  sits under `[locale]`), which is fine inside an iframe. When the data service cannot answer, the status stays
  200 and the browser shows the retry state, because "cannot tell" is not "does not exist".
- **Language.** The proxy skips browser-language detection for `/embed`, so the language is whatever the URL
  says (the site that embeds it chose it). Without that, a visitor's browser would redirect an embedded Spanish
  widget to the English one.
- **Share sheet.** Proposal pages have an "Insertar en tu sitio" / "Embed on your site" option that copies the
  snippet: `<iframe src="<site>/embed/p/<id>" title="Votalo" width="100%" height="420"
  style="border:0;border-radius:16px" loading="lazy"></iframe>`. The `title` attribute is the one addition to the
  requested snippet: frames without a title fail basic accessibility checks. The `src` uses the current site's
  address and language (Spanish at the root, `/en/...` in English).
- **Tests.** `src/security/frame-headers.test.ts` checks the rules and their order. The crawler (`npm run
  test:links`, also in CI) checks live responses: `/embed/*` (both languages, theme, and its 404) allows
  framing and sends no `X-Frame-Options`; pages, app routes, API routes and a 404 do not allow it; the widget has
  no navbar or footer and honours `?theme=light`; both languages are reachable; a malformed id is a 404. Against
  a server with a real indexer the example id does not exist, so set `CRAWL_EMBED_ID` to a real proposal id.
  Also checked by hand in a real browser from another origin: the widget loaded in an iframe, and the browser
  itself refused to frame `/groups` and `/`.

## Final domain: passkey RP id, site URL, old-host redirect (2026-10-05)

- **Passkey RP id** `NEXT_PUBLIC_RP_ID=votalo.xyz` (Vercel Production). It is the registrable domain, so
  passkeys work on both `votalo.xyz` and `www.votalo.xyz`. Before this, the fallback bound new passkeys to
  whichever host served the page, so `www.votalo.xyz` would have produced a passkey bound to `www.votalo.xyz`.
- **Passkeys created on `votalo-six.vercel.app` are bound to that host and will not carry over.** These are
  test identities only. This is expected. Also, a `*.vercel.app` origin cannot use the `votalo.xyz` RP id, so
  passkey creation no longer works on preview or old hosts at all. The old host now redirects to the final
  domain (below), so those test identities are not reachable from anywhere.
- **Site URL** `NEXT_PUBLIC_SITE_URL=https://www.votalo.xyz` (Vercel Production). It sets `metadataBase`
  (og:url, og:image) in `src/app/[locale]/layout.tsx`. Share links and embed snippets now use it too
  (`src/components/share/share-sheet.tsx`), so they never use `window.location.origin`, which would be
  whatever host the viewer is on.
- **Old host redirect.** `next.config.ts` `redirects()` sends `votalo-six.vercel.app/<path>` to
  `https://www.votalo.xyz/<path>` with a permanent (308) status, keeping the path and query. It is scoped to
  that host, so preview deployments are unaffected.
- **No hardcoded `vercel.app` or `votalo.xyz` host remains in `src/`, the README, or the frontend doc.**
  `docs/SPEC.md` keeps the domain as a spec fact, and that file is not app output.

- **Verified after the final deploy** (commit `c679d57`, production on `www.votalo.xyz`):
  - Passkey: a virtual authenticator with PRF enabled, driven through headless Chrome over CDP, created a
    passkey on `https://www.votalo.xyz/en/start`. The credential is bound to RP id `votalo.xyz`, and onboarding
    completed on `/en/groups`. This is a virtual authenticator, not a real phone, so a phone check is still
    needed before delivery.
  - Metadata: `https://www.votalo.xyz/en` has `og:url` = `https://www.votalo.xyz/en`. A proposal page has `og:url`
    pointing at its own URL and an `og:image` under `https://www.votalo.xyz/`.
  - Redirect: `https://votalo-six.vercel.app/en/stats?x=1` → `308` to `https://www.votalo.xyz/en/stats?x=1`.
    Path and query are kept.

## Real-device gate: PASSED (2026-10-05)

- **Gate:** passkey create and sign-in on a real phone, end to end, on the final domain.
- **Result:** the user created a group "Open" on `https://www.votalo.xyz` from their phone, with a real
  passkey bound to RP id `votalo.xyz`. They shared the link, a second person joined from their own device,
  and both voted on "Vótalo.xyz Will win the metrópolis hackathon?" (Yes: 2 votes).
- **On-chain check** (read-only, `cast call` on `0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072`, Monad testnet):
  `totalGroups` = 8, `totalMembers` = 17, `totalProposals` = 4, `totalVotes` = 7. These match the hub's
  verification. Accented group names were stored correctly.
- **Desktop without PRF:** a desktop browser without PRF support showed the "can't create your passkey" screen
  with the QR code, as designed.
- **Still open before delivery:** remove `src/app/[locale]/test-passkey` (already removed in `95a4843`);
  Lighthouse on the deployed site.

## Share metadata and brand files (2026-10-05)

- **What was wrong in production** (checked against `www.votalo.xyz` before changing anything): no `og:image` on
  any marketing or app page while `twitter:card` was `summary_large_image`; `og:url` was `…/es` on every page
  (the layout hard-coded `/${locale}`, which is also the wrong shape: Spanish is at the root); no canonical link
  and no language alternates; and on proposal pages the image URL Next emits (`/es/g/…/opengraph-image-…`)
  answered **307**, not 200, because the language proxy redirects `/es/...` to `/...`.
- **One helper for every page.** `src/seo/metadata.ts` `pageMetadata({ locale, path, title })` returns the title,
  description, canonical, `alternates.languages` (`es`, `en`, and `x-default` pointing at Spanish), and the Open
  Graph and Twitter cards. The canonical and `og:url` are built from the same string, so they cannot disagree.
  Addresses come from `getPathname` (Spanish at the root, English under `/en`, never `/es`) and
  `NEXT_PUBLIC_SITE_URL` (`src/seo/site.ts`). The layout now only sets defaults and no `og:url`, so a page that
  forgot the helper has no `og:url` instead of a wrong one.
- **Share images are plain routes, not the `opengraph-image` file convention**, so their URLs are ours and return
  200 directly: `/og/es.png` and `/og/en.png` (1200x630, prerendered at build) and
  `/og/proposal/<locale>/<proposalId>.png` (drawn on request). The `.png` at the end keeps them out of the
  language proxy. The cards use the Plaza palette, the logo, the hero line from the messages ("Decidan juntos. Que
  nadie haga trampa." / "Decide together. No one gets to cheat.") and a decorative living ring. **The ring never
  shows numbers**: a card is cached by whoever receives it, and a count on it would go stale.
- **Real names in previews.** A proposal page's title and card show the real question, and a group page's title
  is the group name, because that is what people see in the chat. They are read through the same handlers that
  serve `/api/data/*` (`src/seo/data.ts`: same cache, no indexer address, 2.5 s limit) and fall back to a generic
  title when the data service cannot answer. A card with the real question is cached for a day, the generic one
  for five minutes, so a failed read heals quickly.
- **Brand font in the cards.** Bricolage Grotesque (600 and 800, latin) lives in `src/seo/fonts/` with its OFL
  license, is read from disk, and is listed in `outputFileTracingIncludes` so the deployed function that draws
  proposal cards can find it. (Loading it with `fetch(new URL(..., import.meta.url))` works only inside Next's
  image file convention and failed the build here.)
- **Test.** `src/links/share-metadata.test.ts` (run by `npm run test:links`, or against any server with
  `CRAWL_BASE_URL`): for 17 pages in both languages it checks `og:url` = canonical = the page's own address,
  nothing under `/es`, the `es`/`en`/`x-default` alternates, `twitter:image` = `og:image`, one origin across the
  tags, and that each image is a real 200 `image/png` of 1200x630. It fails on the pre-fix production.
- **Brand files** in `public/brand/`: the mark and the logo with its name as SVG (wordmark as outlines, so no
  font is needed), each for light and dark backgrounds, plus the mark as transparent PNGs at 512 and 1024 px
  (the top-left pixel has alpha 0, checked). They use the same geometry as `src/components/brand/logo.tsx`.
  They were generated by a throwaway script (not in the repo: it needs a font-outline library and a browser), so
  if the logo changes, regenerate them. The README links them; it does not state a license for them, because
  that is the owner's decision.

## Lighthouse on production (2026-10-05)

Lighthouse 13.5.0, mobile preset (4x CPU slowdown, simulated 150 ms RTT and 1.6 Mbps), Edge headless, against
`https://www.votalo.xyz`, 5 runs per page, on a machine with nothing else running.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | median 93 (runs 93, 92, 93, 94, 77) | 100 | 100 | 100 |
| `/create` | median 95 (runs 95, 94, 95, 93, 95) | 100 | 100 | 100 |

FCP 1.1–1.3 s, TBT 125–140 ms, CLS 0, on both pages.

- **Targets met** on the median. Accessibility, best practices and SEO are 100 in every run. Performance is above
  90 on the median but not in every run: one of five runs on `/` scored 77, and a first batch that overlapped
  with other work on the same machine scored 82 (TBT 480 ms instead of 125 ms). Single runs swing by 10+ points
  with CPU contention, so the numbers above are medians of runs taken on an idle machine, not a promise per run.
- **Baseline before today's changes** was the same (median 93 on `/`, 94 on `/create`), so the share metadata,
  the brand files and the copy pass did not move performance.
- **What the remaining findings are.** LCP is about 3 s in the simulation. A filmstrip of the same load shows the
  page visually complete at about 750 ms: the 3 s comes from Lighthouse's simulated font and CSS request chain,
  not from a late element. "Legacy JavaScript" (14 KiB) is Next's own polyfill module, which the app cannot
  remove. "Unused JavaScript" on `/create` is the `motion` chunk, which Next prefetches there for the next screen.
- **Tried and not kept.** `inlineCss: true` (no gain on a local build, reverted). Loading Geist Mono without
  preload (`preload: false`, kept: it is harmless and the mono font is only used for ids and numbers).
- **Not done.** Moving the animation components to motion's `LazyMotion` and `m` would trim the bundle somewhat
  (not measured). It touches every animated component close to the freeze, for a modest gain on a
  page that already meets the target, so it is left out.
- **Re-check after any change** with 5 runs and compare medians, never single runs.

## Final QA pass (2026-10-05)

- **What was run.** A phone-sized browser (390x844, touch, 2x, a virtual passkey with PRF) against a production
  build in local mode, in Spanish and English, dark and light (4 runs of each script): create a group
  (invite-only), open the share sheet (WhatsApp link prefilled, invite link with signature, QR), group page, new
  vote (duplicate options blocked), hold to vote, the ring and bars update, "my standing", Me, Groups, Stats,
  About and the branded 404; and, on the example group, create passkey, join, hold to vote, result, reload keeps
  the vote locked. The unsupported-browser screen (QR, supported and unsupported lists) was checked with a
  passkey that has no PRF. No script failed, no page threw an error and no page scrolled sideways.
- **What was not done, and why.** No physical phone was used in this pass, and a second device joining a group
  was not exercised: in local mode a group exists only in the browser that made it, and doing it live would
  write new records to the real contract. The real-phone check (create on a phone, a second person joins, both
  vote) is the one recorded as passed above.
- **Honesty rules checked in the text.** Votes are described as visible under the voter's credential and the
  record as public (privacy summary, privacy page, FAQ, About, legal). The device list names iPhone with iOS 18+
  (Safari or Chrome), Android with Chrome, desktop Chrome with Google Password Manager or 1Password, and Windows
  11 25H2+, and says the desktop Chrome local profile, Bitwarden and Dashlane do not work. The hero demo is
  labelled as an interactive example. Stats show numbers read from the contract, and a message instead of a
  chart when the data service is not connected.
- **Known wording choice.** The copy uses "fingerprint" for the passkey as a metaphor and says in the same
  places that Face ID or the phone's PIN work too; the confirm prompts say "your fingerprint" even when the
  person uses Face ID or a PIN.

## Brand pack page and one logo (2026-10-05)

- **The page.** The brand pack made by the Monad team from our logo is published as a static folder:
  `public/branding-votalo/` (page, README, full ZIP, SVG, PNG), served at `/branding-votalo`. It is one page for
  both languages (it has its own ES/EN toggle), so it has no `/en` version and the footer link ("Marca" /
  "Brand") is a plain `<a href="/branding-votalo">`, not the localized `Link`. The files were not edited.
- **How it is wired.** `next.config.ts` rewrites `/branding-votalo` (and the slash form) to the folder's
  `index.html`; `src/proxy.ts` excludes `branding-votalo` from the language matcher, otherwise the proxy would
  redirect it to a locale route. With a trailing slash Next answers its usual 308 to the slash-less address,
  never to a language. No Content-Security-Policy change was needed: the only policy the site sends is
  `frame-ancestors`, so the page's inline script and styles are not blocked.
- **Crawler.** It now honours `<base href>` (the page's relative links only resolve against it) and does not
  count a link to `/branding-votalo` as a language switch. The static link test allows that one static path.
  `crawl.test.ts` checks the page, its downloads, the ZIP content type and the no-redirect behaviour.
- **One logo.** The pack's mark has real gaps between the arcs. `logo.tsx` and the share-card mark
  (`src/seo/og.tsx`) now use its geometry: each arc is shortened by 4.6 (was 3) and the next arc starts 2.6
  later (was 1). Both numbers matter: the gap between arcs is their sum minus the round caps, so changing only
  the first would leave the arcs 1.6 closer than the pack's. The files in `public/brand/` were replaced by
  the pack's (mark and lockup SVGs, mark PNGs at 512 and 1024, light and dark), keeping their names so the README
  table and any links keep working. The PNG corners have alpha 0 (checked).

## Encrypted group vault (2026-10-05)

- **Problem solved**: "your groups" lived only in one browser's `localStorage`. On a new device the
  passkey syncs, but the group ids were unreachable, so per-group identities were orphaned.
- **Two new PRF salts**, separate from `groupPrfSalt` (`identity/groupSalt.ts`):
  `keccak256("votalo/vault/v1")` for the AES key, `keccak256("votalo/vault-id/v1")` for the lookup id.
  Mera's PRF API takes one salt per ceremony (checked its types directly: no multi-salt option), so the
  two values need two separate assertions, not one.
- **Prompt count, by design**: the vault id is cached in `localStorage` after the first time it is
  derived (safe: it is an opaque lookup name, not a secret — it reveals nothing without the vault key,
  which is never cached). So `saveVault` needs one prompt on a device that has saved before, and two the
  very first time. `restoreVault` (a new device, nothing cached) always needs two. Documented in
  `docs/FRONTEND.md` so the "Restore my groups" button Monse builds can set expectations correctly.
- **Vault key**: HKDF-SHA256(PRF output, info `votalo-vault-aes-v1`) → **non-extractable** AES-256-GCM
  `CryptoKey` (WebCrypto `deriveKey`, not `deriveBits`), so the raw key bytes never exist in JS memory.
- **Vault id**: HKDF-SHA256(PRF output, info `votalo-vault-id-v1`) → 64-char hex string.
- **Encryption**: fresh random 12-byte IV per write (`crypto.getRandomValues`), AES-GCM, stored as
  `{ iv, ciphertext }` (base64). The server never sees plaintext, the PRF output, or any key — confirmed
  by a test that the PUT handler stores exactly those two JSON keys.
- **Storage: Vercel Blob**, private access (not public — reads need the server's token, not just a
  guessable URL; double protection on top of AES-GCM). Store `votalo-vault` created via
  `vercel blob create-store votalo-vault --access private`; `BLOB_READ_WRITE_TOKEN` is a server-only env
  var, auto-injected once linked to the project. Pathname `vault/<vaultId>.json`, `addRandomSuffix:
  false` (the vault id is already a 256-bit opaque value, so no extra randomness is needed) and
  `allowOverwrite: true` (a PUT replaces the previous save).
- **Route** `PUT`/`GET /api/vault/:vaultId`: 16 KB body cap, per-IP and per-vault-id rate limits
  (`vault/limits.ts`, same per-instance tradeoff as the relay's). The handler logic (`vault/handler.ts`)
  takes its storage as a parameter, so it is unit-tested against an in-memory fake, not real Blob calls.
- **Tests** (`vault/crypto.test.ts`, `vault/handler.test.ts`): round trip; decrypting with the wrong key
  throws (AES-GCM authentication failure); two encryptions of the same content produce different IVs and
  ciphertexts, both still decrypting correctly; the vault id, the vault-key PRF output, and a group's PRF
  output are pairwise unrelated for the same passkey (tested with the same fake-authenticator convention
  as `identity.test.ts`); the server-side handler stores only `{ iv, ciphertext }`; oversized and
  malformed bodies are rejected; the per-vault-id rate limit kicks in.
- **Not yet done**: wiring `saveVault` into the actual create/join flows and a restore button is
  explicitly Monse's work per the frontend contract (`docs/FRONTEND.md`); the library side is complete,
  tested, and documented for her to call.
- **Working-directory note**: this session shares the Votalo checkout with at least one other live
  session (Monse's), which was mid-way through an uncommitted `/pitch` deck page when this work started.
  The sandbox correctly blocked an attempt to `git stash` her uncommitted work, which was the right call —
  that risk belongs to her, not to me. She resolved it herself (a separate `ui/pitch` branch, not yet
  merged to `main`), and nothing of hers was touched or lost. Every commit in this entry was staged by
  explicit file path, never `git add -A`, to keep the two sessions' work from mixing.

## Vault verified live in production (2026-10-06)

- **Vercel Blob store connected** via the dashboard (CLI/API had no non-interactive path to link an
  existing store to a project — confirmed by reading the CLI's own `--help` output and the public REST
  API reference, which only lists get/create/delete for stores, no connect endpoint). `BLOB_READ_WRITE_TOKEN`
  is now set for Production and Preview.
- **Verified end to end against `https://www.votalo.xyz/api/vault/:vaultId`**, not a local or mocked
  server: `PUT` with a real AES-GCM-encrypted payload → `200 {"ok":true}`; `GET` of the same id → `200`,
  body is exactly `{ iv, ciphertext }`; decrypting the returned value with the matching key reproduces
  the original content exactly; `GET` of a vault id that was never written → `404`. The script used the
  same HKDF info strings as `src/lib/vault/crypto.ts`, with a locally generated key/id standing in for a
  real PRF output (no real passkey was used for this check).
- **Not yet done**: a real passkey, on a real device, through the actual UI. That needs `saveVault` and
  `restoreVault` wired into the create/join flows and a restore button, which is Monse's side per
  `docs/FRONTEND.md`.

## Group list backup in the UI (2026-10-05)

- **Where it runs.** `src/data/vault.ts` wraps `src/lib/vault`: `backUpGroups` after every create and join
  (saves the whole list, one save at a time, status shown to the screen), and `restoreMyGroups` for the
  "Recuperar mis grupos" / "Restore my groups" button on `/groups` (only when this device has no groups),
  on `/me`, and in the compact form on the passkey screen. The vault code loads only when the button is
  pressed.
- **Names are kept locally.** Each joined group now stores its name in the browser store (`members[id].name`),
  so the encrypted list has a readable name without a network call. Restored groups get the name from the vault.
- **No vault yet** is a normal message ("Todavía no hay grupos guardados…"), not an error. A passkey that cannot
  sign in shows the usual passkey messages.
- **Failed save** keeps the group and shows "No pudimos guardar…" with a retry. Shown in the share sheet too,
  because the sheet opens by itself after a create and covers the page.
- **Prompts measured in the emulated test.** A first create on a new device: 3 passkey prompts (group key, vault
  id, vault key). A later create: 2 (vault id is cached). A restore on a cleared device: 4 (vault id, vault key,
  then one per group). These are prompts for the passkey, not the same thing as taps.
- **Privacy line** ("La lista de tus grupos se guarda cifrada…") is on the restore block, in the privacy
  section, and as slide 5's fourth point. The legal notice mentions the encrypted list.
- **Tests.** `vault-qa` (local mode, virtual passkey, in-memory stand-in for the vault route): create, clear
  site data, restore, restore again, no vault yet, failed save; all pass in ES/EN, dark/light. The stand-in is
  not production storage; the production route was verified separately.
- **Not verified here.** The real-phone gate (create on one device, restore on another with the same synced
  passkey) has not been run by me; it needs a physical phone and is still open.

## Vault UX: one PRF evaluation, in-memory session key, addresses in the vault (2026-10-06)

- **Why.** Monse measured the live flow: first create on a new device 3 prompts, later creates 2, restore on a
  cleared device 4. Too many for a one-fingerprint product.
- **One salt.** The vault now uses one PRF salt, `keccak256("votalo/vault/v1")`. HKDF with two info strings gives
  the AES key (`votalo-vault-aes-v1`, non-extractable) and the lookup id (`votalo-vault-id-v1`). The separate
  vault-id salt is removed. Mera's API takes one `prfSalt` per ceremony (checked its types), so the group key and
  the vault output cannot share one assertion. That is not worked around: the vault costs one ceremony of its own,
  and passkey creation is used as the first one (the creation ceremony takes `prfSalt`, a documented option).
- **Old vault ids.** Checked the Blob store before switching: it held one blob, 285 bytes, written by my own
  round-trip test. No user vaults existed, so no fallback to the old id was needed. That test blob is still there,
  under an id nothing will ever derive again; it holds nothing a user could read.
- **Session key in memory only.** `vault/session.ts` keeps the key and id in a module variable, never in storage.
  It ends after 15 minutes without use, on `clearVaultSession()` (sign-out), and on `pagehide`. A reload clears it.
  The vault id is no longer cached in `localStorage`; `localCache.ts` is removed.
- **Restore target.** The member address for each group is now stored inside the encrypted vault, so restore no
  longer asks once per group. The address is authenticated by the same AES-GCM key as the group ids, so only the
  passkey holder can write it. Entries without it (none exist) fall back to the per-group prompt.
- **Prompt counts** (unit tests with a counting authenticator; a browser re-measure is still needed): new passkey
  and first group 2 (plus one if the authenticator skips PRF at creation); later creates 1; first save on a device
  with a passkey but no session 2; restore on a cleared device 1.
- **Signatures.** `saveVault`, `restoreVault` and `createVotaloPasskey` keep their signatures. New:
  `restoreVaultFromPasskey`, `clearVaultSession`. `VaultGroupEntry` gained an optional `memberAddress`. Documented in
  `docs/FRONTEND.md`.
- **Edit to Monse's file.** `src/data/vault.ts` (her restore flow) had its own first prompt to look up the vault id,
  which the new design removes, and it imported the deleted modules. I changed only `restoreMyGroups` (use
  `restoreVaultFromPasskey` when no passkey is saved, use the stored member address) and `currentEntries` (write the
  address). Without this, `main` would not compile. She should review that diff.
