# Product Vision — Navo

## Problem

Non‑developers need to turn ideas into working experiences quickly, without learning stacks, frameworks, or deployment. Traditional no‑code tools still require time‑consuming setup and complex choices.

## Vision

Make product creation conversational and visual. Users describe the goal, tweak what they see, and ship in minutes. Navo handles generation, composition, and deployment behind the scenes.

## Value Proposition

- Speed: AI draft in ~10 seconds; one‑click publish in ~60 seconds
- Simplicity: zero‑code defaults with optional dev mode later
- Safety: isolated steps with rollback and clear diffs
- Learning Loop: analytics → AI suggestions → one‑click apply

## Target Users

- SMB owners and creators
- Non‑technical founders testing ideas
- Marketing teams running rapid experiments

## Differentiators

- DI + DAG orchestration that parallelizes work safely and observably
- Standard renderer for consistent previews and edits
- Built‑in analytics and suggestions to improve outcomes

## Success Metrics (MVP)

- TTV(draft) P95 ≤ 10 s
- Editor perceived latency ≤ 200 ms
- Average publish duration ≤ 60 s
- Availability ≥ 99.5%
- Daily suggestions surfaced with ≥ 20% apply rate

## Out of Scope (MVP)

- Exposing infra or tech choices to end users
- Deep plugin ecosystems or marketplace
- Heavy customization that breaks the standardized renderer

## Principles

- Zero‑code first; dev‑mode optional
- Minutes to live
- Always improving

## Links

- High‑level in `README.md`
- Architecture in `docs/tech/architecture.md`
- Orchestrator details in `docs/tech/dag-di.md`
