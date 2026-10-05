# Votalo indexer

Envio HyperIndex indexer for the Votalo contract on Monad testnet, indexing `GroupCreated`,
`MemberJoined`, `ProposalCreated`, and `VoteCast` from the deploy block. See
[../docs/FRONTEND.md](../docs/FRONTEND.md) for the GraphQL shape this produces, and
[../docs/DECISIONS.md](../docs/DECISIONS.md) for the hosting choice.

## Local development

Requires Docker (Envio runs Postgres and Hasura locally). On Windows, run this from WSL with Docker
Desktop's WSL integration enabled, since Envio's CLI has no native Windows build.

```bash
npm install
npm run codegen   # regenerate types after changing config.yaml or schema.graphql
npm run dev        # starts local Postgres + Hasura + the indexer, with a GraphQL playground
```

## Files

- `config.yaml`: chain, contract address, start block, and indexed events.
- `schema.graphql`: the indexed entities (Group, Member, Proposal, Vote, DailyVoteCount).
- `abis/Votalo.json`: generated from `contracts/out` — regenerate if the contract's events change.
- `src/EventHandlers.ts`: one handler per event. Updates entities from on-chain data only.
