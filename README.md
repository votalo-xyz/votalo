# Votalo

Votalo ("vote on it") lets any group make decisions together from a shared link. Members vote with a
passkey (Face ID, fingerprint, or device PIN), with no wallet, seed phrase or app to install.

- **Try it:** [30-second walkthrough](#try-it-in-30-seconds), or open https://www.votalo.xyz
- **Pitch:** https://www.votalo.xyz/pitch

Each vote is an EIP-712 signature from a per-group key derived from the member's passkey, recorded on
Monad testnet. Results update live from an indexer.

Votalo is the decision layer community-governed products need: a game voting on its rules, a community choosing its feed's ranking, a collective deciding on its fund — one person, one vote, results no one can rig.

## Try it in 30 seconds

Best on a phone.

1. Open the live demo vote: https://www.votalo.xyz/g/0x53676d443e295c214fe73175d666a2351887cfb6ea183e90e2aceac3e69732e7/p/0x14cba3ff5e73af97d55adb4080ec1435ee95ee49b37eeef720594cd2af5c1721
2. Create your passkey with your fingerprint or face. No wallet, no account, no gas.
3. Pick an option and hold the fingerprint button, or hold the option itself. The vote lands on Monad testnet and the ring updates live.
4. Optional: start your own group from "Create" and share the link.

The demo vote ("Try Votalo" group, open to anyone) stays open until Nov 3, 2026 (23:34 in Mexico City, which is 05:34 UTC on Nov 4). Each person votes once, and votes can't be edited.

## How it works

1. **Passkey.** The member's passkey is created or used with WebAuthn PRF through
   [Mera](https://mera.category.xyz). A per-group salt gives each member a separate signing key for each
   group. Two members of different groups cannot be linked on-chain.
2. **Signature.** The app builds the EIP-712 digest for the action (create group, join, propose, vote) and the
   group key signs it in the browser. The key is derived, used and zeroed; it is never stored.
3. **Relayer.** A server route checks the signature, simulates the call, then sends the transaction with an
   explicit gas limit. The relayer pays gas only; it never holds user keys or funds.
4. **Contract.** `Votalo.sol` on Monad testnet verifies every signature and enforces the rules: one vote per member,
   single-use invites, deadlines, and length bounds.
5. **Indexer.** An [Envio HyperIndex](https://envio.dev) indexer (HyperSync) reads the four events and serves them
   over GraphQL. The app reads through its own server routes, which cache results to stay within the hosted
   plan's rate limit.
6. **Encrypted group vault.** The list of groups is encrypted in the browser with a key from the passkey, and the
   server stores only the ciphertext. A new device restores the list with the same passkey.

## Contract

`Votalo` on Monad testnet (chain ID 10143):

- Address: `0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072`
- Explorer: [testnet.monadvision.com/address/0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072](https://testnet.monadvision.com/address/0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072)
- Deploy transaction: `0xfef9cf83f188d13b8718644e7b9046dab11dd1a2790d2b4c45e057a0f76f55e0` (block 68466493)
- Source verified on Sourcify (runtime match).

## Local setup

Requirements: Node 24, npm. Foundry 1.8 or later for the contracts (Monad execution requires it). Docker,
for the indexer only; on Windows run the indexer from WSL, since Envio's CLI has no native Windows build.

```bash
cp .env.example .env   # optional for local use; .env is git-ignored
npm install
npm run dev            # http://localhost:3000
```

The app runs without any environment variables. Without them, data screens show local example data and group
actions are recorded in the browser only, not on-chain. The relay, data and vault routes need the variables in
`.env.example` to work for real.

## Tests and checks

```bash
npm run lint           # ESLint
npx tsc --noEmit       # type check
npm test               # unit tests (vitest); live testnet tests skip unless E2E_BASE_URL is set
npm run build && npm run test:links   # production build, then the link crawler
cd contracts && forge test --network monad   # Foundry 1.8 or later
```

## Indexer

```bash
cd indexer
npm install
npm run codegen -- --config config.local.yaml
npm run dev -- --config config.local.yaml   # local Postgres, Hasura and indexer, RPC only, no token needed
```

`config.yaml` is the hosted configuration (HyperSync as the source). `config.local.yaml` is the same chain and
contract using RPC only, which works without an Envio API token. See [indexer/README.md](indexer/README.md).

## Deployment

The app is deployed on Vercel. Set these in the project's environment:

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_RP_ID` | Production | Passkey relying party (`votalo.xyz`) |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical site URL for metadata and share links |
| `RELAYER_PRIVATE_KEY` | Production | Relayer key (testnet MON only); server-only, never logged |
| `ENVIO_GRAPHQL_URL` | Production | Hosted indexer endpoint; server-only |
| `BLOB_READ_WRITE_TOKEN` | Production, Preview | Vercel Blob store for the encrypted vault; set by linking the store |

The hosted indexer's endpoint changes on each redeploy on the free plan, so `ENVIO_GRAPHQL_URL` must be updated to
match. See [docs/DECISIONS.md](docs/DECISIONS.md).

## Docs

- [docs/SPEC.md](docs/SPEC.md): the build specification.
- [docs/FRONTEND.md](docs/FRONTEND.md): the interface contract (routes, data, vault, relay).
- [docs/DECISIONS.md](docs/DECISIONS.md): architecture decisions and the log of what was verified and when.

## Known limits

- **A person can hold more than one passkey.** INVITE mode limits this to one member per invite.
  OPEN mode does not prevent it.
- **Invite links work for whoever uses them first.** An invite signature covers the group and the
  invite id, not the joining member. Anyone who gets the link, or sees a pending join, can use the
  invite for their own key first. Binding an invite to a member is not possible, because the
  member's per-group key does not exist until they open the link.
- **No membership snapshot.** In OPEN mode, members who join after a proposal is created can still vote
  on it. This is accepted for v1.
- **The relayer sees request IPs.** Identities in different groups are unlinkable on-chain, but the
  relayer is a trusted party for availability and rate limiting. It never holds user keys or funds.
- **Votes are pseudonymous, not secret.** Each vote is public per member address inside its group.
- **The relayer's gas key is set only for the Production environment** on Vercel, not Preview. Preview deploys cannot relay transactions until that is set separately.
- **The vault server learns only that some passkey stored about N bytes, and when.** It stores
  `{ iv, ciphertext }` under an opaque id and nothing else: no plaintext, no PRF output, no key, no
  group names or ids. It cannot tell which passkey owns a vault, or link two vaults to the same
  person, beyond what request timing and size alone reveal.

## Brand

The Votalo logo, as SVG and as transparent PNGs. The `-on-dark` files use the dark-theme colors and a light
center dot, for dark backgrounds; the others are for light backgrounds.

The full pack (SVG and PNG in every size, avatars, favicons, share banner and a short guide) is at
[www.votalo.xyz/branding-votalo](https://www.votalo.xyz/branding-votalo); its files live in `public/branding-votalo/`.

| File | Use |
|---|---|
| [votalo-logo.svg](public/brand/votalo-logo.svg) | Logo with name (wordmark as outlines, no font needed), light backgrounds |
| [votalo-logo-on-dark.svg](public/brand/votalo-logo-on-dark.svg) | Logo with name, dark backgrounds |
| [votalo-mark.svg](public/brand/votalo-mark.svg) | Mark only, light backgrounds |
| [votalo-mark-on-dark.svg](public/brand/votalo-mark-on-dark.svg) | Mark only, dark backgrounds |
| [votalo-mark-512.png](public/brand/votalo-mark-512.png), [votalo-mark-1024.png](public/brand/votalo-mark-1024.png) | Mark, 512 and 1024 px square, transparent, light backgrounds |
| [votalo-mark-on-dark-512.png](public/brand/votalo-mark-on-dark-512.png), [votalo-mark-on-dark-1024.png](public/brand/votalo-mark-on-dark-1024.png) | Mark, 512 and 1024 px square, transparent, dark backgrounds |

The mark is three arcs and a dot: the same shape as the living ring that shows results. The wordmark is
Bricolage Grotesque ExtraBold, used under the SIL Open Font License (`src/seo/fonts/OFL.txt`).

## License

MIT. See [LICENSE](LICENSE).
