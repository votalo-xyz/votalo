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

## License

MIT. See [LICENSE](LICENSE).
