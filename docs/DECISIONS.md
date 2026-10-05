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
