# Navo Unified Roadmap

This document provides a unified, high-level roadmap for the Navo project, integrating the overall product strategy with the technical development of the Gemini Orchestrator.

---

## Phase 1: MVP (Completed)

**Goal:** Build and validate the core user journey: AI-powered project generation, visual editing, and one-click publishing.

| Week    | Key Deliverables                                                        | Status  |
| :------ | :---------------------------------------------------------------------- | :------ |
| **W1**  | DB Schema, Mock Project API, Editor Frame, Event Collector              | ✅ Done |
| **W2**  | Text/Image/Style Editing, Basic Chat-to-Diff, Asset Upload              | ✅ Done |
| **W3**  | AI Intent Parser, Full Project Structure Generation, Hot-Reload Dev Env | ✅ Done |
| **W4**  | Deployment Pipeline (Vercel), Basic Analytics, AI Suggestions v1        | ✅ Done |
| **W4+** | Component System Architecture Rework & Auto-Error Resolution            | ✅ Done |

---

## Phase 2: Private Beta (In Progress)

**Goal:** Evolve the MVP into a robust product for a small group of beta users. The primary focus is on turning the AI's generated plan into a live, interactive application.

| Focus Area                              | Key Deliverables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Status   |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **1. Blueprint-driven Code Generation** | - **Blueprint (IR) Schema Definition**: Formalize the framework-agnostic JSON schema for describing application structure and logic. <br> ✅ _Confirmed by Gemini on 2025-09-16: The schema exists at `packages/shared/src/project-blueprint.schema.ts` and is sufficient for the next steps._ <br> - **Blueprint-driven Scaffolding**: Implement the workflow where the AI Planner (`projectArchitect` tool) generates a complete project Blueprint (IR). <br> ✅ _Confirmed by Gemini on 2025-09-16: This is handled by the AI Planner in `workflow.service.ts` which generates a plan to run the `scaffold_project_from_blueprint` tool._ <br> - **Blueprint-to-React Compiler**: Develop the first "compiler" tool that takes the Blueprint (IR) as input and generates functional React/Next.js components and file structure into the VFS. <br> ✅ _Confirmed by Gemini on 2025-09-16: This is the `scaffold_project_from_blueprint` tool located in `projectScaffolder.tool.ts`, which recursively creates VFS nodes from the blueprint's file structure._ <br> - **Live Preview Integration**: Connect the generated VFS content to a live preview environment. | ✅ Done  |
| **2. Orchestrator Enhancement**         | - **Real-time Workflow Streaming**: Stream the progress of plan execution (step start, completion, errors) in real-time via SSE. <br> ✅ _This was an undocumented feature, now confirmed. Implemented via \`connectionManager\` in \`workflow.controller.ts\`._ <br> - **Dynamic Task Generation**: Implement the core logic for the AI to decompose user requests into executable DAGs. <br> ✅ _Completed on 2025-01-27: Enhanced AI planner with advanced DAG optimization, conditional execution, and retry policies._ <br> - **Dependency Management**: Build the system for managing dependencies between tasks in a plan. <br> ✅ _Completed on 2025-01-27: Advanced dependency analyzer with circular dependency detection, topological sorting, and parallel execution optimization._ <br> - **Advanced Error Handling**: Implement robust retry, rollback, and recovery mechanisms. <br> ✅ _Completed on 2025-01-27: Comprehensive rollback manager with checkpoint system, recovery strategies, and automatic cleanup._                                                                                                                                                                                                                                                                                                                                                                                                          | ✅ Done  |
| **3. Feature Maturation**               | - **Advanced AI Suggestions (v2)**: Introduce suggestions for SEO, performance, and content optimization. <br> - **Template Library**: Allow users to start from and save project templates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 📝 To Do |
| **4. Platform Foundation**              | - **Authentication & Payments**: Implement a secure auth system and integrate a payment gateway for monetization. <br> - **Sharing & QR Codes**: Add features to easily share published sites.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 📝 To Do |

---

## Phase 3: Public Launch

**Goal:** Prepare for a public launch by focusing on user onboarding, pricing, documentation, and support.

- Finalize Pricing Tiers
- Improve the New User Onboarding Experience
- Build a Public Gallery of Demo Projects
- Create Comprehensive Support Documentation
- Implement System Status & Monitoring Dashboards

---

## Phase 4: Scale & Marketplace

**Goal:** Grow the platform's capabilities by introducing a marketplace and catering to larger teams and enterprises.

- Plugin/Widget Marketplace for third-party extensions
- Multi-Project & Team/Organization Support
- On-Premise / Enterprise Deployment Options

---

## Technical Deployment Strategy

The deployment architecture is a key part of our strategy. For full details, please refer to the **[Platform Configuration & Deployment Strategy](./archive/platform-deployment-strategy.md)** document (this will be archived but remains relevant).

- **Frontend**: React/Next.js, deployed on **Vercel** for its global CDN and performance.
- **Backend (BFF & Core Services)**: Node.js (and future Go services), deployed on **Render** for its flexibility with web services and managed databases.