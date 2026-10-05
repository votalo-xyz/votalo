# Votalo — build specification

Sanitized build spec. Safe to copy into the public repo as `docs/SPEC.md`.
It contains technical requirements only: no budgets, no evaluation strategy, no comparisons.

Spec date: 2026-10-05. Target network: **Monad testnet (chain ID 10143)**.
Feature freeze: 2026-10-11 evening (America/Mexico_City). Final delivery: 2026-10-13 before 12:00 America/Mexico_City.

---

## 1. Product

**Votalo** ("vote on it", in Spanish) lets any group make decisions together from a shared link.

- A group (friends, a collective, a club, a WhatsApp or Telegram group) creates a proposal and shares the link.
- Members open it on their phone and vote with a passkey (Face ID, fingerprint, device PIN). No wallet, no
  seed phrase, no app install, no extension.
- Each vote is recorded on Monad. Results update live.
- Each person has a **separate identity in every group**, all derived from the same passkey. Inside a group
  it is stable and verifiable: one passkey, one member, one vote per proposal. Across groups, identities
  cannot be linked to each other on-chain.
- A member's participation history in a group (votes cast, proposals made) is their standing in that
  community. It belongs to them and anyone can verify it.

Audience: people who do not consider themselves crypto users. The UI never says "wallet", "gas",
"transaction", "token", or "blockchain" in the main flows. Monad is named in the footer, the about page,
and the docs.

Languages: UI in **Spanish by default** with an English toggle. Repo docs (README, SPEC, DECISIONS) in **English**.

## 2. Hard constraints

1. **Mera is the entire account layer.** Package `@category-labs/mera` (web). No other auth or wallet
   provider. No seed phrases shown in normal flows. No backend holds user keys or user funds.
2. **Per-group keys from one passkey.** Derived with Mera's `prfSalt` option (see section 4).
3. **Gas is sponsored by a relayer** that only pays gas. It never holds user funds and never holds user keys.
   Users sign EIP-712 messages; the contract verifies the signature.
4. **Monad only.** Public material (repo, README, site) names only Monad. No other networks.
5. **Secrets only in environment variables.** The relayer private key lives in env vars (Vercel env and a
   local `.env` that is git-ignored). Never in a file that is committed, never in logs.
6. **Explicit, tight gas limits** on every relayed transaction. Observed on Monad testnet (2026-10-05): a
   reverted tx was charged its full gas limit. Simulate (`eth_call`) before sending and refuse to send if
   the simulation reverts.
7. **Open source**: public GitHub repository, MIT license.
8. The product name and repo name must not contain the words "SDK" or "Developer".

## 3. Stack

- **Web**: Next.js (App Router) + TypeScript, mobile-first, installable PWA. Hosted on Vercel at
  `https://votalo.xyz` (domain owned; DNS must be pointed to Vercel by the owner).
- **Chain**: Solidity + Foundry **v1.8 or later** (required for Monad execution). viem on the client and the relayer.
- **Indexing**: Envio HyperIndex on Monad testnet (HyperSync endpoint `https://10143.hypersync.xyz`), exposed
  via GraphQL to the web app.
- Monad testnet: RPC `https://testnet-rpc.monad.xyz`, explorer `https://testnet.monadvision.com`,
  faucet `https://faucet.monad.xyz`. Re-check live values with the Monad docs MCP or the RPC before relying on them.

## 4. Identity model (Mera)

- Onboarding: `createPasskeyWithPrfOutput({ rp: { id: "votalo.xyz", name: "Votalo" }, user: {...} })`.
  Store only `credentialId` and `transports` in `localStorage` (they hold no key material).
- Returning use: `getPasskeyPrfOutput({ rpId, credential, prfSalt })`.
- **Per-group salt**: `prfSalt = keccak256(utf8("votalo/group/v1/") || groupId)` where `groupId` is a random
  `bytes32` chosen at group creation. 32 bytes, as Mera requires.
- **Per-group signing key**: derive a secp256k1 private key from the 32-byte PRF output. Prefer Mera's own
  derivation helpers if they accept arbitrary PRF output; otherwise HKDF-SHA256 (info `"votalo-member-key-v1"`)
  with a range check `0 < k < n`. Wrap it in a Mera secp256k1 signing session. End the session and zero
  buffers after signing.
- Properties to test:
  - Same passkey + same group → same member address, on every device where the passkey syncs.
  - Same passkey + different group → different, unlinkable addresses.
- **PRF availability**: catch Mera's `PRF_UNAVAILABLE`. Show a clear screen in plain language: this browser
  cannot create the passkey type Votalo needs, plus a QR code to open the same link on a phone. Supported:
  iOS 18+ Safari/Chrome (iCloud Keychain), Android Chrome (Google Password Manager), desktop Chrome with
  Google Password Manager, 1Password, Windows 11 25H2+ Windows Password Manager. Not supported: desktop
  Chrome local profile, Bitwarden, Dashlane. Source: Mera `authenticator-support` doc, 2026-06.
- Never store the PRF output. Never log it.

## 5. Contract: `Votalo.sol`

One contract, EIP-712 domain `{ name: "Votalo", version: "1", chainId: 10143, verifyingContract }`.

**Groups**
- `createGroup(bytes32 groupId, uint8 mode, address admin, string name, bytes adminSig)`
  - `mode`: `OPEN` (anyone with the link joins) or `INVITE` (single-use invites signed by the admin).
  - `admin` is the creator's per-group member address. `adminSig` proves control of it.
  - Store `keccak256(name)`. Emit the full `name` in the event.
- `join(bytes32 groupId, address member, bytes memberSig, bytes32 inviteId, bytes adminInviteSig)`
  - OPEN: `inviteId`/`adminInviteSig` empty.
  - INVITE: admin signed `Invite{groupId, inviteId}`. Each `inviteId` usable once.
  - A member joins a group once.

**Proposals**
- `createProposal(bytes32 groupId, bytes32 proposalId, address author, string title, string[] options, uint64 deadline, bytes authorSig)`
  - Author must be a member. 2 to 6 options. Title ≤ 140 bytes, option ≤ 40 bytes. Deadline in the future,
    at most 30 days out.
  - Store hashes; emit full text in the event.
- `vote(bytes32 proposalId, address member, uint8 choice, bytes memberSig)`
  - Member of the proposal's group. Before the deadline. One vote per member per proposal (final).
  - Keep per-option counts on-chain.

**Events** (the indexer depends on these): `GroupCreated`, `MemberJoined`, `ProposalCreated`, `VoteCast`.

**Typed data**: `CreateGroup`, `Join`, `Invite`, `CreateProposal`, `Vote`, each including a per-signer nonce
or a unique id to prevent replay.

**Tests (Foundry)**: signature verification and rejection of bad signatures, replay protection, single-use
invites, one vote per member, deadline enforcement, option and length bounds, OPEN vs INVITE behavior,
events and counts. Add fuzz tests for choice bounds and lengths.

Deploy to Monad testnet and verify the source on the explorer (follow the Monad Foundry verification guide).

## 6. Relayer

- Next.js route handlers (`/api/relay/*`), one per action. Each validates input, recomputes the EIP-712
  digest, checks the signature off-chain, simulates with `eth_call`, then sends with an explicit gas limit.
- Relayer key from env (`RELAYER_PRIVATE_KEY`), funded with testnet MON only.
- Rate limits: per IP and per member address. Daily global cap with a clear "come back later" message.
- Returns the tx hash. The UI waits for the receipt (Monad is fast) and confirms in plain language.
- Logs never include signatures' key material, PRF output, or the relayer key.

## 7. Indexer and live data

- Envio HyperIndex project indexing the four events from the deployment block.
- Entities: Group, Member (per group), Proposal (with option counts), Vote.
- Web reads via GraphQL. Results refresh within seconds of a vote.
- **Member profile in a group**: votes cast, proposals created, groups-joined date. Only within that group.
- **Public stats page** `/stats`: total groups, members, proposals, votes, and votes per day.

## 8. Screens (mobile-first)

1. Landing: what Votalo does in one sentence, "Create a group" button, language toggle.
2. Passkey onboarding (or PRF-unavailable screen).
3. Create group: name, OPEN/INVITE mode → share link (WhatsApp button with prefilled text, copy link, QR).
4. Group page: proposals (open and closed), members count, "New proposal".
5. Proposal page: title, options, vote with one tap + biometric, live results, time left, share.
6. My standing in this group: history.
7. Stats, About (explains the per-group identity and that votes live on Monad).

Each shared proposal link must render a good preview (Open Graph image with the title).

## 9. Phases and gates

| Phase | Target date | Gate (must be true to move on) |
|---|---|---|
| 0. Setup | Oct 5 | Next.js + Foundry scaffold builds; Vercel preview deploys; `.env.example` committed, `.env` ignored |
| 1. Passkey + per-group keys | Oct 6 | Passkey create/sign-in works on a real phone; unit tests prove same-group same-address and cross-group different-address |
| 2. Contract | Oct 7 | All Foundry tests pass; deployed and verified on Monad testnet; address recorded in README |
| 3. Relayer + flows | Oct 8 | Create group → join → propose → vote end to end on testnet with real tx hashes |
| 4. Indexer | Oct 9 | Envio running; live results and member history from GraphQL |
| 5. UX polish | Oct 10 | Spanish/English, share previews, PRF-unavailable screen, mobile layout reviewed on a phone |
| 6. Hardening and docs | Oct 11 | Stats page; README with architecture, how to try it, contract address, test instructions; DECISIONS.md current. **Feature freeze** |
| 7. Delivery | Oct 12-13 | Only fixes. Demo group ready for reviewers |

Each phase ends with a short report: what works, tx hashes or test output as evidence, and what slipped.

## 10. Repository docs

- `README.md` (English): what it is, try-it link, how it works (passkey → per-group key → signed vote →
  relayer → Monad → indexer), contract address on Monad testnet, local setup, license.
- `docs/SPEC.md`: this file.
- `docs/DECISIONS.md`: running log of architecture decisions, deferred scope, and environment surprises.

## 11. Known limits (state them openly in the README)

- A person can create more than one passkey. INVITE mode limits this to one member per invite; OPEN mode
  does not prevent it.
- The relayer sees request IPs. On-chain, identities in different groups are unlinkable, but the relayer is a
  trusted party for availability and rate limiting.
- Votes are public per member address inside a group (pseudonymous, not secret ballot).
