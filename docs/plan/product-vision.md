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

## User Data Ownership & AI Actions

A core aspect of our vision is empowering end-users with full ownership and control over their data, even when AI actions are involved. This means:

### Key Concepts & Challenges:

- **Data Segregation (Multi-tenancy):** Each user's data must be securely isolated. This can be achieved through isolated databases, separate database schemas per user, or robust row-level security within a shared database. The choice impacts complexity and scalability.
- **Authentication & Authorization:** A strong system is required to verify user identity and control their access to only their own data and permitted actions.
- **Privacy & Compliance:** Adherence to data protection regulations (e.g., GDPR, CCPA) is paramount, including consent, data minimization, and the right to data export/deletion.
- **AI Interaction with User Data:** AI actions must operate strictly within the boundaries of a user's data, respecting privacy and permissions. This implies careful design of AI prompts and data access patterns.

### Required Resources & Components:

To support this vision, we will need:

- **Backend Services:**
  - **User Management System:** For user lifecycle (registration, login, profile).
  - **API Gateway:** Secure entry point for all client requests.
  - **Core Application Logic:** Services implementing platform features, interacting with user-specific data.
  - **AI Service Integration:** Secure APIs for interacting with AI models (like Gemini), ensuring data isolation during processing.
- **Data Storage:**
  - **Database System:** A scalable database (e.g., PostgreSQL) configured for multi-tenancy (e.g., using separate schemas or row-level security).
  - **File Storage:** For user-uploaded assets (e.g., cloud storage like S3).
- **Frontend Application:** User interface for data management and AI-driven interactions.
- **Infrastructure & Operations:**
  - **Cloud Provider:** For hosting and scaling (e.g., Render, AWS, GCP).
  - **Compute Resources:** Servers (VMs, containers, serverless) for backend services.
  - **Networking:** Load balancers, firewalls for secure and performant access.
  - **Monitoring & Logging:** For system health, performance, and security.
  - **CI/CD Pipeline:** For automated deployments.
