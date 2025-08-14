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

## Data Storage Rationale
The project uses a database as the primary source of truth for content and metadata, rather than managing content directly in Git files. This decision is based on the following reasons:
- **Speed & Latency**: Database queries are significantly faster for the frequent, granular read/write operations required by a real-time visual editor, compared to the slower `git commit/push/pull` cycle.
- **Granular Control**: A database allows for atomic updates to small pieces of data (e.g., a single component's properties), which is more efficient than file-based operations.
- **Concurrency**: Databases are designed to handle simultaneous operations from multiple users, which is crucial for future real-time collaboration features.
- **Analytics**: A structured database is necessary for efficiently querying and aggregating the data needed for the analytics and AI suggestion features.

The architecture uses a hybrid model:
1.  **Database as Source of Truth**: The editor interacts directly with the database for a fast and responsive user experience.
2.  **Git as Deployment Target**: When a user publishes their project, the system generates the necessary files from the database and commits them to a Git repository, which then triggers a CI/CD pipeline for deployment.

### Scalability
Database size is managed through two key strategies:
- **Assets**: Large binary files (images, videos) are not stored in the database. The `assets` table only contains a URL pointing to the file's location in a dedicated object storage service (e.g., AWS S3).
- **Events**: The `events` table, which can grow large, can be managed with standard data engineering practices like TTL (Time-To-Live) policies, archiving, or aggregating raw data into summary tables as the service scales.

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