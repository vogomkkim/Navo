# DI + Node Graph (Plain Language)

## Core Ideas
- Node: a small job with inputs/outputs
- Graph (DAG): dependencies without cycles
- DI: provides services (APIs, config, logger)

## Why This Pattern
- Faster: run independent nodes in parallel
- Safer: isolate, retry, and observe each node
- Extensible: add a node and link it in the graph

## How It Works
1. Define nodes with `name`, `deps`, and `run(ctx)`.
2. Validate DAG and compute topological order.
3. Execute with concurrency, respecting deps.
4. Store outputs for downstream nodes.
5. Log durations and outcomes; surface progress to the UI.

## Example 1: Draft Generation
- Nodes: `writeCopy`, `generateImage`, `buildPage`
- `writeCopy` and `generateImage` run in parallel.
- `buildPage` composes a layout JSON/HTML.

## Example 2: Publish
- Nodes: `buildPage` (or cached), `deploySite`
- `deploySite` deploys to CDN and returns a URL.

## Contracts
- Nodes declare inputs/outputs
- DI context exposes shared resources
- Outputs accessible by node name

## Observability
- Log node name, duration, status
- Track retries/timeouts
- Emit events for editor and publish actions

## Next Steps
- Add retry policy and cancellation
- Formalize event contracts and schemas

See `README.md` and `docs/tech/architecture.md` for more.