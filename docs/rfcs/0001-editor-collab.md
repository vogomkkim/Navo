# RFC 0001 — Editor Collaboration

- Status: Draft
- Date: YYYY‑MM‑DD
- Authors: TBD

## Problem Statement
Describe the need for real‑time or asynchronous collaboration in the Visual Editor. Identify pain points (e.g., conflict resolution, presence, offline edits).

## Context
Summarize current editor architecture and data model. Note constraints and requirements (latency, eventual consistency, undo/redo).

## Goals
- Smooth multi‑user editing experience
- Minimal perceived latency
- Clear conflict resolution and history

## Non‑Goals
- Building a generic CRDT framework for external use
- Full offline support in MVP

## Options Considered
1. OT (Operational Transform)
2. CRDT (e.g., Yjs)
3. Single‑writer with server‑side queue
4. Hybrid (CRDT for content; server authority for structure)

## Decision
Describe the chosen approach and why it fits MVP needs (simplicity, performance, maintainability).

## Consequences
List trade‑offs, migration considerations, and risks.

## Implementation Plan
- Phases and milestones
- Metrics to monitor

## References
- Link to related issues/PRs and prior art

Refer back to `README.md` for overall principles and scope.