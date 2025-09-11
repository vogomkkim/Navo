# Navo Unified Roadmap

This document provides a unified, high-level roadmap for the Navo project, integrating the overall product strategy with the technical development of the Gemini Orchestrator.

---

## Phase 1: MVP (Completed)

**Goal:** Build and validate the core user journey: AI-powered project generation, visual editing, and one-click publishing.

| Week | Key Deliverables | Status |
| :--- | :--- | :--- |
| **W1** | DB Schema, Mock Project API, Editor Frame, Event Collector | ✅ Done |
| **W2** | Text/Image/Style Editing, Basic Chat-to-Diff, Asset Upload | ✅ Done |
| **W3** | AI Intent Parser, Full Project Structure Generation, Hot-Reload Dev Env | ✅ Done |
| **W4** | Deployment Pipeline (Vercel), Basic Analytics, AI Suggestions v1 | ✅ Done |
| **W4+**| Component System Architecture Rework & Auto-Error Resolution | ✅ Done |

---

## Phase 2: Private Beta (In Progress)

**Goal:** Evolve the MVP into a robust product for a small group of beta users. The primary focus is on turning the AI's generated plan into a live, interactive application.

| Focus Area | Key Deliverables | Status |
| :--- | :--- | :--- |
| **1. Blueprint-driven Code Generation** | - **Blueprint (IR) Schema Definition**: Formalize the framework-agnostic JSON schema for describing application structure and logic. <br> - **Blueprint-driven Scaffolding**: Implement the workflow where the AI Planner (`projectArchitect` tool) generates a complete project Blueprint (IR). <br> - **Blueprint-to-React Compiler**: Develop the first "compiler" tool that takes the Blueprint (IR) as input and generates functional React/Next.js components and file structure into the VFS. <br> - **Live Preview Integration**: Connect the generated VFS content to a live preview environment. | 🔄 In Progress |
| **2. Orchestrator Enhancement** | - **Dynamic Task Generation**: Implement the core logic for the AI to decompose user requests into executable DAGs. <br> - **Dependency Management**: Build the system for managing dependencies between tasks in a plan. <br> - **Advanced Error Handling**: Implement robust retry, rollback, and recovery mechanisms. | 📝 To Do |
| **3. Feature Maturation** | - **Advanced AI Suggestions (v2)**: Introduce suggestions for SEO, performance, and content optimization. <br> - **Template Library**: Allow users to start from and save project templates. | 📝 To Do |
| **4. Platform Foundation** | - **Authentication & Payments**: Implement a secure auth system and integrate a payment gateway for monetization. <br> - **Sharing & QR Codes**: Add features to easily share published sites. | 📝 To Do |

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
