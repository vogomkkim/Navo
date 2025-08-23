# Navo — Speak it, see it, ship it.

> **Goal**: A zero‑code AI web/app builder where non‑developers can say an idea, tweak what they see, and publish in one click.  
> **Flow**: Onboarding → AI Draft → Visual Editing → One‑click Publish → Analytics & AI Suggestions.

---

## 📄 Full Project Direction

For the complete architectural vision, including frontend/mobile strategy, Go backend plan, node-graph orchestration, LLM integration, and CI/CD automation:  
➡️ [**Project Direction Document**](docs/plan/000_project_direction.md)

---

## 0) Executive One‑Pager

**What**: AI‑assisted product builder for non‑developers.  
**Who**: SMB owners, creators, non‑technical founders, marketers.  
**Why**: People don't care about tech choices; they want visible results fast.  
**How**: Standardized renderer + **DI + Node Graph** orchestrator + automatic hosting/CDN + feedback loop.

**Principles**

- **Zero‑code first** (code is hidden; dev‑mode optional)
- **Minutes to live** (draft ≤ 10s, publish ≈ 60s)
- **Always improving** (analytics → AI suggestions → one‑click apply)

---

## 1) UX Flow (User Journey)

1. **Onboarding**: purpose/target/brand input → pick initial template.
2. **AI Draft**: generate layout, copy, images; preview within ~10s.
3. **Visual Editor**: click‑to‑edit text/images/style/layout + chat commands.
4. **Publish**: one‑click; subdomain + SSL + CDN; rollback recent builds.
5. **Analytics**: visitors/clicks/basic conversion; daily AI suggestions; one‑click apply.

**Non‑goals**: exposing code/infra terms to end users; forcing tech choices.

**See [docs/ux/flow.md](docs/ux/flow.md) for detailed user journey and [docs/ux/wireframes.md](docs/ux/wireframes.md) for screen descriptions.**

---

## 2) MVP Scope v0.9

Core features: AI Intent Parser for full project structure generation, AI-powered draft generation, visual editor with inline editing, one-click publish with rollback, and basic analytics with AI suggestions.

**See [docs/tech/mvp-scope.md](docs/tech/mvp-scope.md) for full acceptance criteria and SLO targets.**

---

## 3) Architecture Overview

**Client**: Visual Editor, Preview, Publish UI  
**Orchestrator**: DI + Node Graph Runner for parallel task execution  
**Services**: Generation, Storage, Deploy, Analytics  
**Data**: Users, projects, pages, components, assets, events, suggestions, deployments

**See [docs/tech/architecture.md](docs/tech/architecture.md) for detailed architecture and [docs/tech/dag-di.md](docs/tech/dag-di.md) for DI + Node Graph implementation details.**

---

## 4) Roadmap (0→1)

**Phase 1 (MVP) - Completed:**
- AI Intent Parser for full project structure generation (database schema, pages, components, API endpoints)
- AI-powered draft generation and database integration
- One-click publish with Vercel integration and rollback
- Basic analytics (view/click tracking) and AI suggestions

**Next: Phase 2 (Private Beta) - Code Generation and Live Preview**

**See [docs/tech/roadmap.md](docs/tech/roadmap.md) for detailed deliverables and demo goals.**

---

## 5) KPIs

- **Speed**: TTV(draft), P95 edit latency, publish duration
- **Efficiency**: instances/cores, throughput per vCPU/GB
- **Reliability**: error/timeout/retry rates, rollback ratio
- **Dev Velocity**: PR lead time, deploy frequency, change‑fail rate

---

## 6) Working Agreements

- Keep docs short, **link back to this README**.
- Prefer plain language; no framework wars or jargon.
- Every change should include a short "why" in the PR description.
- We optimize **experience** first; tech choices are replaceable.
- **Agent Role**: As the primary agent, I am responsible for leading the project's planning, documentation, vision setting, and goal definition. I will proactively drive the project forward, ensuring clear communication and detailed progress tracking.

---

## 7) Credits & Contact

Internal codename: **Navo**.  
Questions/ideas: open an Issue or start an RFC under `docs/rfcs/`.

---

## 📚 Documentation

- **Product Vision**: [docs/plan/product-vision.md](docs/plan/product-vision.md)
- **Technical Architecture**: [docs/tech/architecture.md](docs/tech/architecture.md)
- **MVP Scope**: [docs/tech/mvp-scope.md](docs/tech/mvp-scope.md)
- **Development Roadmap**: [docs/tech/roadmap.md](docs/tech/roadmap.md)
- **Contributing**: [docs/team/CONTRIBUTING.md](docs/team/CONTRIBUTING.md)
