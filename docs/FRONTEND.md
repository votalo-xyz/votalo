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
Returns `NEXT_PUBLIC_RP_ID` when set, otherwise the current hostname. Passkeys are bound to it, so a
preview origin and votalo.xyz do not share passkeys.

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

Test-only route: `/test-passkey` (passkey creation and member-address check). It is marked for
removal before delivery.

## Chain reads (`src/lib/chain/read.ts`) — ready

`getGroup(groupId)`, `isMember(groupId, member)`, `getProposal(proposalId)` (includes `counts`),
`hasVoted(proposalId, member)`, `getTotals()`. Read straight from the chain; the GraphQL layer replaces
them for lists and history.

## GraphQL (`indexer/`) — schema ready; endpoint URL pending deployment

Envio HyperIndex over the four events, indexing from the deploy block (68466493). Entities:
`Group`, `Member`, `Proposal`, `Vote`, `DailyVoteCount` (see `indexer/schema.graphql`). Hasura
generates the query API from these, including relation fields and `_aggregate` queries for counts.

Endpoint URL: not yet published here — set once the indexer is deployed (see
`docs/DECISIONS.md` for the hosting choice). Local dev serves GraphQL at
`http://localhost:8080/v1/graphql` (`cd indexer && npm run dev`).

**Group page** (name, mode, member count, admin, proposals):
```graphql
query Group($id: String!) {
  Group_by_pk(id: $id) {
    name mode admin memberCount createdAt
    proposals(order_by: { createdAt: desc }) { id title deadline voteCount }
  }
}
```

**Proposal + live results** (title, options, per-option counts, time left via `deadline`):
```graphql
query Proposal($id: String!) {
  Proposal_by_pk(id: $id) {
    title options deadline voteCount optionCounts
    group { id name }
  }
}
```

**Member profile within one group** (votes cast, proposals created, joined date — scoped to the
group by the composite id `${groupId}-${address}`):
```graphql
query MemberProfile($id: String!) {
  Member_by_pk(id: $id) {
    address joinedAt
    votesCast { proposal { id title } choice votedAt }
    proposalsCreated { id title createdAt }
  }
}
```

**Public stats** (totals via Hasura's generated aggregates, plus votes per day):
```graphql
query Stats {
  Group_aggregate { aggregate { count } }
  Member_aggregate { aggregate { count } }
  Proposal_aggregate { aggregate { count } }
  Vote_aggregate { aggregate { count } }
  DailyVoteCount(order_by: { id: asc }) { id votes }
}
```

Results refresh within seconds of a vote (Envio indexes close to chain head on Monad testnet).

Schema and endpoint will be published here when the indexer is deployed.

## Copy and language

UI text is Spanish by default with an English toggle. Never use "wallet", "gas", "transaction", "token",
or "blockchain" in the main flows. Monad is named only in the footer, About, and docs.
