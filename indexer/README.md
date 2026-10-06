# Votalo indexer

Envio HyperIndex indexer for the Votalo contract on Monad testnet, indexing `GroupCreated`,
`MemberJoined`, `ProposalCreated`, and `VoteCast` from the deploy block. See
[../docs/FRONTEND.md](../docs/FRONTEND.md) for the GraphQL shape this produces, and
[../docs/DECISIONS.md](../docs/DECISIONS.md) for the hosting choice.

## Local development

Requires Docker (Envio runs Postgres and Hasura locally). On Windows, run this from WSL with Docker
Desktop's WSL integration enabled, since Envio's CLI has no native Windows build.

`config.yaml` (used for the hosted deployment) relies on HyperSync, which needs an `ENVIO_API_TOKEN`
you likely don't have locally. For local dev, use `config.local.yaml` instead: same chain and
contract, but RPC-only (`rpc.for: sync`), so no token is needed. It runs slower (capped at 100 blocks
per `eth_getLogs` call, Monad testnet's own limit) but needs nothing beyond the public RPC.

```bash
npm install
npm run codegen -- --config config.local.yaml   # regenerate types after changing a config file or schema.graphql
npm run dev -- --config config.local.yaml        # starts local Postgres + Hasura + the indexer, RPC-only
```

To test against `config.yaml` (HyperSync) locally, set `ENVIO_API_TOKEN` yourself and drop the
`--config` flag (it defaults to `config.yaml`).

## Files

- `config.yaml`: the hosted deployment's config — HyperSync as the primary source, RPC as fallback.
- `config.local.yaml`: local-dev-only variant — RPC-only, no token needed. Keep both in sync when the
  chain, contract, or events change; only `rpc.for` and the comments should differ between them.
- `schema.graphql`: the indexed entities (Group, Member, Proposal, Vote, DailyVoteCount).
- `abis/Votalo.json`: generated from `contracts/out` — regenerate if the contract's events change.
- `src/EventHandlers.ts`: one handler per event. Updates entities from on-chain data only.
