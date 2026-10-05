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

## Contract actions (`contracts/src/Votalo.sol`) — ready (contract); relay planned

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

## Sign-and-relay (planned: Phase 3)

Planned route: `POST /api/relay/<action>` (`createGroup`, `join`, `createProposal`, `vote`). Body: the
action arguments plus the member signature. Response: `{ txHash }` on success, or `{ error: <code> }`.
The relayer checks the signature off-chain, simulates with `eth_call`, then sends with an explicit gas
limit. Rate limits apply per IP and per member; a daily cap returns a "come back later" message.

Client flow (planned):
1. Build the digest from the contract view function (or an identical client-side encoder, verified in tests).
2. `signDigestAsMember(prf, digest)` after `getGroupPrfOutput`.
3. POST to the relay route, wait for the receipt, then show the result in plain language.

## GraphQL (planned: Phase 4)

Envio HyperIndex over the four events. Planned queries:

- `group(id)`: name, mode, member count, admin.
- `proposal(id)`: title, options, deadline, option counts, time left.
- `proposalResults(id)`: per-option counts, refreshed within seconds of a vote.
- `memberProfile(groupId, member)`: votes cast, proposals created, joined date. Only within that group.
- `stats()`: total groups, members, proposals, votes, votes per day.

Schema and endpoint will be published here when the indexer is deployed.

## Copy and language

UI text is Spanish by default with an English toggle. Never use "wallet", "gas", "transaction", "token",
or "blockchain" in the main flows. Monad is named only in the footer, About, and docs.
