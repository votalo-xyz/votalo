# Votalo

Votalo ("vote on it") lets any group make decisions together from a shared link.
Members vote with a passkey (Face ID, fingerprint, or device PIN). Each vote is
recorded on Monad testnet.

Status: early build. See [docs/SPEC.md](docs/SPEC.md) for the build specification
and [docs/DECISIONS.md](docs/DECISIONS.md) for architecture decisions.

## Local setup

```bash
cp .env.example .env   # fill in values; .env is git-ignored
npm install
npm run dev
```

## Deployment

Votalo contract on Monad testnet (chain ID 10143):

- Address: `0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072`
- Deploy transaction: `0xfef9cf83f188d13b8718644e7b9046dab11dd1a2790d2b4c45e057a0f76f55e0` (block 68466493, success)
- Explorer: [testnet.monadvision.com/address/0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072](https://testnet.monadvision.com/address/0x2cd363f9158c82aA3AE8C1F12430dD4Fb4D4f072)
- Source verified on Sourcify (runtime match).

Run the contract tests with `cd contracts && forge test --network monad` (Foundry v1.8 or later).

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
