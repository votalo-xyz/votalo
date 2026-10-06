# Frontend interface

Contract for the screens in [SPEC.md](SPEC.md) section 8. Built by the frontend contributor; logic and
data access by the core contributor. Keep this file in sync with any API change.

Status key: **ready** (implemented and tested), **planned** (not built yet; shape may change).

## Folder boundaries

- `src/lib/**`: core logic and data access. Owned by the core contributor.
- `src/app/**` and `src/components/**`: screens and visual design. Owned by the frontend contributor.
- Changes to a `src/lib` signature go through this file first.

## Passkey and identity (`src/lib/identity`) — ready

Import from `@/lib/identity/...`.

### `currentRpId(): string` (`rpId.ts`)
Returns `NEXT_PUBLIC_RP_ID` when set, otherwise the current hostname. Production sets it to `votalo.xyz`
(the registrable domain), so passkeys work on both `votalo.xyz` and `www.votalo.xyz`. Passkeys are bound to
this id: a `*.vercel.app` origin cannot use `votalo.xyz`, so passkeys cannot be created on preview hosts.

Share links and embed snippets use `NEXT_PUBLIC_SITE_URL` (production: `https://www.votalo.xyz`), never a
hardcoded or `*.vercel.app` host. Build any new link or embed code from that value.

### `createVotaloPasskey({ rpId, displayName, webAuthnClient? }): Promise<PasskeyCredential>` (`passkey.ts`)
Creates the user's passkey (one biometric or device-PIN prompt). Returns `{ credentialId, transports? }`.
Throws `MeraError` with code `PRF_UNAVAILABLE` when the browser cannot use the required passkey type.

```ts
const cred = await createVotaloPasskey({ rpId: currentRpId(), displayName: "Ana" });
saveCredential(cred);
```

### `getGroupPrfOutput({ rpId, credential, groupId, webAuthnClient? }): Promise<Uint8Array>` (`passkey.ts`)
One assertion prompt. Returns the 32-byte PRF output for this group. Same passkey and group give the same
output on every device where the passkey syncs. **Never store or log this value.**

### `isPrfUnavailable(error: unknown): boolean` (`passkey.ts`)
True when the error is Mera's `PRF_UNAVAILABLE`. Show the plain-language "open this link on a phone"
screen (with a QR code) when true.

```ts
try {
  const cred = await createVotaloPasskey({ rpId: currentRpId(), displayName });
} catch (e) {
  if (isPrfUnavailable(e)) showPrfUnavailableScreen();
  else throw e;
}
```

### `saveCredential(cred: PasskeyCredential): void` / `loadCredential(): PasskeyCredential | null` (`credentialStore.ts`)
Stores only `credentialId` and `transports` in `localStorage`. Both are safe when storage is blocked.

### `groupPrfSalt(groupId: Hex): Uint8Array` (`groupSalt.ts`)
`keccak256("votalo/group/v1/" || groupId)`. Throws if `groupId` is not 32-byte hex. Usually called inside
`getGroupPrfOutput`; call it directly only for tests.

### `memberAddressFromPrf(prfOutput: Uint8Array): Promise<EvmAddress>` (`memberKey.ts`)
The member's address for this group. Stable per passkey and group. Use it to show "you" and to pass as
`member` or `author` to the contract.

### `signDigestAsMember(prfOutput, digest32): Promise<{ address, signature }>` (`memberKey.ts`)
Signs a 32-byte EIP-712 digest. `signature` is `{ compact: Uint8Array(64), recovery: 0 | 1 }`. Used by the
sign-and-relay flow below. The key is derived, used, and zeroed inside the call.

## Contract actions (`contracts/src/Votalo.sol`) — ready

Each action needs an EIP-712 signature from the acting member. The relayer submits it and pays gas.
Digests for signing come from the contract's view functions, so the client does not re-encode them:

| Action | Digest function | Arguments the signer signs | Event |
|---|---|---|---|
| Create group | `hashCreateGroup(groupId, mode, admin, name)` | `CreateGroup` | `GroupCreated` |
| Join | `hashJoin(groupId, member)` | `Join` | `MemberJoined` |
| Invite (INVITE mode, by admin) | `hashInvite(groupId, inviteId)` | `Invite` | (used in `join`) |
| Create proposal | `hashCreateProposal(groupId, proposalId, author, title, options, deadline)` | `CreateProposal` | `ProposalCreated` |
| Vote | `hashVote(proposalId, member, choice)` | `Vote` | `VoteCast` |

Read-only: `getCounts(proposalId): uint256[]`, `groups(groupId)`, `proposals(proposalId)`, `isMember`,
`hasVoted`, `totals` (`totalGroups`, `totalMembers`, `totalProposals`, `totalVotes`).

Sizes and limits: group name 1–80 bytes; title 1–140 bytes; 2–6 options, each 1–40 bytes; deadline
strictly in the future and at most 30 days out.

### Error codes (Solidity custom errors, as the relayer returns them)

`GroupExists`, `GroupNotFound`, `InvalidMode`, `InvalidAdmin`, `InvalidMember`, `InvalidNameLength`,
`NotMember`, `AlreadyMember`, `InvalidSignature`, `InviteRequired`, `InviteNotAllowed`,
`InviteAlreadyUsed`, `ProposalExists`, `ProposalNotFound`, `InvalidTitleLength`, `InvalidOptionCount`,
`InvalidOptionLength`, `InvalidDeadline`, `VotingClosed`, `AlreadyVoted`, `InvalidChoice`.

Show these as plain language. Never show the raw name.

## Sign-and-relay (`src/lib/flows`, `/api/relay/*`) — ready (Phase 3)

Browser flows. Each takes `{ rpId, credential, ... }` from the passkey step and returns the tx hash.
Each flow prompts for the passkey once (group PRF), signs the contract digest, and posts to the relay.

| Flow | Arguments | Returns | Relay route |
|---|---|---|---|
| `createGroup` | `{ rpId, credential, name, mode: 0 \| 1 }` | `{ groupId, admin, txHash }` | `/api/relay/create-group` |
| `createInvite` (admin, INVITE groups) | `{ rpId, credential, groupId }` | `{ inviteId, adminInviteSig }` — put both in the link | none (off-chain) |
| `joinGroup` | `{ rpId, credential, groupId, invite? }` | `{ member, txHash }` | `/api/relay/join` |
| `createProposal` | `{ rpId, credential, groupId, title, options, deadlineSeconds }` | `{ proposalId, txHash }` | `/api/relay/create-proposal` |
| `castVote` | `{ rpId, credential, groupId, proposalId, choice }` | `{ member, txHash }` | `/api/relay/vote` |

Errors are thrown as `RelayClientError` with `code` (a contract error name, such as `AlreadyVoted`, or
`NETWORK`, `INTERNAL`, `RATE_LIMITED`, `DAILY_CAP_REACHED`, `RELAYER_NOT_CONFIGURED`, or `INVALID_INPUT:<field>`).
The `status` field carries the HTTP status.

```ts
import { castVote } from "@/lib/flows/votalo";
try {
  const { txHash } = await castVote({ rpId: currentRpId(), credential, groupId, proposalId, choice: 1 });
} catch (e) {
  if (e instanceof RelayClientError && e.code === "AlreadyVoted") showAlreadyVoted();
}
```

Relay rules (server side): the signature must recover to the claimed signer (checked before any
chain call); the call is simulated first; gas uses an explicit limit per action. Rate limits: 20 per
IP per minute, 30 per member per hour, and a daily cap set by `RELAY_DAILY_CAP` (default 200). These
are per server instance and best-effort.

Server env: `RELAYER_PRIVATE_KEY` (server only, never `NEXT_PUBLIC_`). Without it, relay routes return
`RELAYER_NOT_CONFIGURED` (503).

The temporary `/test-passkey` page was removed; the real passkey flow now runs inside `/create`.

## Chain reads (`src/lib/chain/read.ts`) — ready

`getGroup(groupId)`, `isMember(groupId, member)`, `getProposal(proposalId)` (includes `counts`),
`hasVoted(proposalId, member)`, `getTotals()`. Read straight from the chain; the GraphQL layer replaces
them for lists and history.

## Data (`src/app/api/data/*`) — ready, live in production

**Call these routes, never the Envio GraphQL endpoint directly.** The hosted Envio plan caps the
whole app at 100 queries/minute, shared across every visitor; a browser calling it directly could
exhaust that on its own. The Envio URL (`ENVIO_GRAPHQL_URL`) is a server-only env var, not
`NEXT_PUBLIC_`, so it isn't reachable from client code at all. Each route proxies one query from the
indexer (`indexer/schema.graphql`: `Group`, `Member`, `Proposal`, `Vote`, `DailyVoteCount`) and
caches the result in memory for a few seconds, so repeat views in that window don't add to the quota.

| Route | Entity id | Cache | Notes |
|---|---|---|---|
| `GET /api/data/group/:id` | `groupId` (32-byte hex) | 10s | Name, mode, admin, member count, proposals |
| `GET /api/data/proposal/:id` | `proposalId` (32-byte hex) | 5s | Title, options, deadline, `voteCount`, `optionCounts` — shorter cache since results are live |
| `GET /api/data/member/:id` | `${groupId}-${address}`, address **lowercase** | 10s | Votes cast, proposals created, joined date — scoped to one group |
| `GET /api/data/votes-per-day` | — | 10s | `/stats` chart data |

Response body is the GraphQL `data` object, unchanged (e.g. `{ "Group_by_pk": { ... } }`). Errors are
`{ "error": CODE }` with an HTTP status: `400` `INVALID_ID`, `502` `ENVIO_UNREACHABLE` /
`ENVIO_QUERY_FAILED`, `503` `ENVIO_NOT_CONFIGURED`.

```ts
const res = await fetch(`/api/data/proposal/${proposalId}`);
const { Proposal_by_pk: proposal } = await res.json();
```

**Public stats**: the four totals (`totalGroups`, `totalMembers`, `totalProposals`, `totalVotes`)
come from the contract directly — `getTotals()` in `src/lib/chain/read.ts`, exact and instant, no
indexer lag, and Hasura's `_aggregate` fields aren't exposed on this instance anyway (confirmed by
introspection). Combine that with `GET /api/data/votes-per-day` for the chart.

Verified against the real Phase 3 run, at every layer — on-chain, the local indexer, the hosted
Envio deployment, and finally the production `/api/data/*` routes themselves: 3 groups, 9 members, 3
proposals (`voteCount`/`optionCounts` of `[1,0]`, `[1,1]`, `[1,1]`, correctly showing run 1's missing
vote), 5 votes, `DailyVoteCount` = `[{ id: "2026-10-05", votes: 5 }]`. See `docs/DECISIONS.md` for
each verification. Results refresh within seconds of a vote, plus up to the route's cache window.

## Copy and language

UI text is Spanish by default with an English toggle. Never use "wallet", "gas", "transaction", "token",
or "blockchain" in the main flows. Monad is named only in the footer, About, and docs.
