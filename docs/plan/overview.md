# Navo — Speak it, see it, ship it.

Navo is a zero‑code AI web/app builder that helps non‑developers turn ideas into live products in minutes. Users describe what they want, tweak what they see, and publish with one click.

## What

- AI‑assisted product builder focused on outcomes, not tech choices.
- Generates layouts, copy, and images; supports visual editing and one‑click publish.
- Includes lightweight analytics and AI suggestions to improve results over time.

## Who

- Small and medium business owners
- Creators and non‑technical founders
- Marketers and operators who need fast experiments

## Why

- Most users care about visible results, not stacks or infra.
- Reduces time‑to‑value from days/weeks to minutes.
- Consistent renderer + orchestration enables speed, safety, and extensibility.

## How

- Standardized rendering engine
- DI + Node Graph orchestrator to parallelize work safely
- Managed hosting/CDN with rollback
- Analytics → AI suggestions → one‑click apply

## UX Flow

1. Onboarding: capture purpose, target audience, and brand; choose a template.
2. AI Draft: generate initial layout, copy, and images in ~10 seconds.
3. Visual Editor: click‑to‑edit text and images; adjust styles; move/add/remove sections; chat edits with visible diffs.
4. Publish: one‑click to a subdomain with SSL and CDN; rollback recent builds.
5. Analytics: track views and clicks; surface daily suggestions to improve copy or style.

## MVP Scope (v0.9)

Core features: AI-powered draft generation, visual editor with inline editing, one-click publish with rollback, and basic analytics with AI suggestions.

**See [docs/tech/mvp-scope.md](../tech/mvp-scope.md) for full acceptance criteria and SLO targets.**

## Architecture

- Client: Visual Editor, Preview, Publish UI
- Orchestrator: DI + DAG runner; nodes for copy, image, build, deploy
- Services: generation, storage, deploy/CDN, analytics
- Data sketch: users, projects, pages, components, assets, events, suggestions, publish_deploys

## Principles

- Zero‑code first
- Minutes to live
- Always improving

## Links

- See `README.md` for the canonical high‑level brief.
- Technical details in `docs/tech/architecture.md` and `docs/tech/dag-di.md`.
- Deployment strategy in [docs/plan/platform-deployment-strategy.md](platform-deployment-strategy.md).
