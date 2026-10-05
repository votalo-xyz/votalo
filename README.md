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

## License

MIT. See [LICENSE](LICENSE).
