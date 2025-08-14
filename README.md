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
**Why**: People don’t care about tech choices; they want visible results fast.  
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

---

## 2) MVP Scope v0.9 (Acceptance Criteria)

**Must‑have**
- Draft preview ≤ 10s (stub/mock acceptable for Week 1–2).
- Editor: inline text edit, image replace/upload, basic style sliders, add/move/remove section, chat edit → visible diff.
- Publish: subdomain auto, success URL, last 3 builds rollback.
- Analytics: `view`, `click` events; daily 1 suggestion (style or copy).

**SLO**
- Editor perceived latency ≤ **200ms**.
- Average publish time ≤ **60s**.
- Availability ≥ **99.5%** (MVP).

**Events (min)**
`view:page`, `click:cta`, `submit:form`, `purchase`, `editor:change`, `publish:success`.

---

## 3) Architecture (Big Picture)

**Client**
- Visual Editor (canvas, side panel, chat box)
- Preview, Publish UI

**Orchestrator**
- **DI + Node Graph Runner**:
  - Node = small task (`GenerateImage`, `WriteCopy`, `BuildPage`, `DeploySite`)
    - Graph = DAG of dependencies (do independent tasks **in parallel**, respect order where needed)
      - DI = inject required resources (APIs, config) into each node automatically

      **Services**
      - Generation: LLM (copy), image
      - Storage: assets, layout JSON
      - Deploy: build → CDN/hosting → URL
      - Analytics: event collector → aggregation → AI suggestions

      **Data (sketch)**
      - `users`, `projects`, `pages`, `components`, `assets`, `events`, `suggestions`, `publish_deploys`.

      **Design Tenets**
      - Simplicity / Observability / Undo&Rollback / Contract‑first.

      ---

      ## 4) DI + Node Graph (Plain Language)

      - **Node** = one small job with inputs/outputs.  
      - **Graph (DAG)** = a map of who depends on whom; independent nodes run **together**; some wait.  
      - **DI** = “prep station”: each node gets its ingredients (APIs, tokens, configs) handed in.

      **Why it matters**
      - Faster (parallel where possible), safer (isolate & retry a node), easier to extend (add a node + link).

      ---

      ## 5) Roadmap (0→1)

      **W1**: Schema, Draft API (mock), Editor frame (canvas/panel/save), events collector skeleton  
      **W2**: Text/image/style edits, Chat→diff (3–5 rules), assets upload/gallery  
      **W3**: Publish pipeline (mock→real), analytics (view/click), suggestion type 1  
      **W4**: Stabilization, Undo/Redo/Autosave, rollback, polish

      ---

      ## 6) KPIs

      - **Speed**: TTV(draft), P95 edit latency, publish duration  
      - **Efficiency**: instances/cores, throughput per vCPU/GB  
      - **Reliability**: error/timeout/retry rates, rollback ratio  
      - **Dev Velocity**: PR lead time, deploy frequency, change‑fail rate

      ---

      ## 7) Repository Workplan (What Copilot Should Do)

      > **Use Copilot Chat inside Codespaces.** Paste the prompts verbatim. Confirm at each step.  
      > Goal: keep this README short‑ish while generating proper docs and skeletons into `docs/` and `navo/`.

      ### 7.1 Create Documentation Files
      **Prompt to Copilot Chat:**
      > Create the following files with concise, well‑structured content based on this README. Use 80‑100 lines per file max. Keep language plain.  
      > 
      > - `docs/overview.md` — one‑pager; What/Who/Why/How; the “Speak it, see it, ship it” line.  
      > - `docs/product-vision.md` — problem, value proposition, success metrics, out‑of‑scope.  
      > - `docs/ux/flow.md` — the 5‑step journey with example user verbs; no images.  
      > - `docs/ux/wireframes.md` — describe 5 key screens in bullets: Onboarding, Draft Preview, Editor, Publish, Analytics.  
      > - `docs/tech/architecture.md` — big picture; components, services, data, observability.  
      > - `docs/tech/dag-di.md` — DI + Node Graph in plain language + 2 concrete Navo examples.  
      > - `docs/tech/mvp-scope.md` — MVP v0.9 acceptance criteria & SLO & events list.  
      > - `docs/tech/roadmap.md` — W1–W4 with deliverables and demo goals.  
      > - `docs/rfcs/0001-editor-collab.md` — RFC template with problem/decision/options.  
      > - `adr/ADR-0001-runtime.md` — choose orchestrator runtime pattern; decision & consequences.

      Then:  
      > Show me a diff preview of all files you will add. Ask before writing.

      If OK:  
      > Proceed to create the files and stage them. Suggest a single commit message.

      ### 7.2 Add Project Hygiene
      **Prompt:**
      > Generate `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md` (email placeholder), `CHANGELOG.md` (0.1.0 init), and `LICENSE` (MIT for now). Keep each file minimal and readable. Show diff, then write & stage.

      ### 7.3 (Optional) Orchestrator Skeleton (no full impl yet)
      **Prompt (TypeScript option):**
      > Create a minimal TypeScript skeleton under `navo/` for a DI + DAG orchestrator:  
      > - `navo/core/node.ts` (Node interface: `name`, `deps`, `run(ctx)`),  
      > - `navo/core/graph.ts` (DAG validation + topological order),  
      > - `navo/core/runner.ts` (run nodes with concurrency; respect deps; basic timeout/cancel hooks),  
      > - `navo/nodes/{generateImage,writeCopy,buildPage,deploySite}.ts` (dummy implementations),  
      > - `navo/demo.ts` (wire nodes into a small graph; `npm run demo`).  
      > Add `package.json` scripts: `build`, `demo`. Provide simple log outputs.  
      > Show diff, then write & stage.

      **Prompt (Go option, if we prefer later):**
      > Create the same structure in Go under `navo/` (`node.go`, `graph.go`, `runner.go`, `nodes/…`, `cmd/demo/main.go`) with simple logging and context cancellation. Show diff before writing.

      ### 7.4 Commit & Push
      **Prompt:**
      > Propose a conventional commit message for everything staged and push to the current branch.

      ---

      ## 8) Working Agreements

      - Keep docs short, **link back to this README**.  
      - Prefer plain language; no framework wars or jargon.  
      - Every change should include a short “why” in the PR description.  
      - We optimize **experience** first; tech choices are replaceable.

      ---

      ## 9) Credits & Contact

      Internal codename: **Navo**.  
      Questions/ideas: open an Issue or start an RFC under `docs/rfcs/`.

      ---