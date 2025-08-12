# Architecture Overview

Navo combines a client‑side visual editor with a DI + DAG orchestrator to generate, build, and deploy projects quickly and safely.

## Components
- Client: Visual Editor (canvas, side panel, chat), Preview, Publish UI
- Orchestrator: Node Graph runner with DI, timeouts, and retries
- Services: generation (LLM, image), storage, deploy/CDN, analytics

## Flow
1. User completes onboarding and requests a draft.
2. Orchestrator executes generation nodes (copy, image) in parallel.
3. Build node composes a page or layout JSON.
4. Deploy node builds and publishes to CDN, returning a public URL.
5. Client receives updates and shows progress; analytics capture events.

## DI + Node Graph
- Node: small job with inputs/outputs and dependencies
- DI: shared services (APIs, config, logger)
- Graph: validated as a DAG; independent nodes run concurrently

## Data (sketch)
- users, projects, pages, components, assets
- events (view, click, publish), suggestions, publish_deploys

## Observability
- Structured logging per node with duration and outcome
- Event stream for editor changes and publishes
- Basic metrics: success rate, retries, P95 latency by node

## Reliability & Safety
- Isolate steps; retry or re‑run a single node when safe
- Rollback last 3 publishes
- Contract‑first interfaces between nodes

## Performance Goals
- Draft generation perceived in ~10 s (with mocks early on)
- Editor interactions ≤ 200 ms
- Publish ≤ 60 s average

See `README.md` for the canonical summary and goals.