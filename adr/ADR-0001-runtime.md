# ADR‑0001: Orchestrator Runtime Pattern

## Status
Accepted

## Context
We need a runtime to execute a graph of small tasks (nodes) with clear dependencies. The runtime should allow parallelism, isolation, observability, and simple error handling. Early development needs fast iteration and minimal operational overhead.

## Decision
Use a TypeScript (Node.js) in‑process orchestrator with DI and a DAG runner for the MVP. Keep the API contract‑first, so we can replace the runtime later if needed.

## Consequences
- Pros: fast developer feedback, easy logging, low infra friction, rich ecosystem
- Cons: single‑process limits; will need scaling/queuing later
- Mitigations: design nodes stateless; keep execution contracts simple; emit events for externalization

## Alternatives Considered
- Go microservice orchestrator: higher perf, more setup
- External workflow engines: powerful but heavier for MVP

## Notes
This ADR may be revisited post‑MVP when distribution and scaling become priorities.