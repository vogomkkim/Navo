# Navo Unified Roadmap

This document provides a unified, high-level roadmap for the Navo project, integrating the overall product strategy with the technical development of the Gemini Orchestrator.

---

## Phase 1: MVP (In Progress)

**Goal:** Build and validate the core user journey: AI-powered project generation, visual editing, and one-click publishing.

| Week | Key Deliverables | Status |
| :--- | :--- | :--- |
| **W1** | DB Schema, Mock Project API, Editor Frame, Event Collector | ✅ Done |
| **W2** | Text/Image/Style Editing, Basic Chat-to-Diff, Asset Upload | ✅ Done |
| **W3** | AI Intent Parser, Full Project Structure Generation, Hot-Reload Dev Env | ✅ Done |
| **W4** | Deployment Pipeline (Vercel), Basic Analytics, AI Suggestions v1 | ✅ Done |
| **W4+**| Component System Architecture Rework & Auto-Error Resolution | 🔄 In Progress |

---

## Phase 2: Private Beta (4-6 Weeks)

**Goal:** Evolve the MVP into a robust product for a small group of beta users. The primary focus is on turning the AI's generated plan into a live, interactive application.

| Focus Area | Key Deliverables |
| :--- | :--- |
| **1. Code Generation & Live Preview** | - **Project Scaffolding**: Auto-generate file/directory structure and install dependencies. <br> - **Backend Code Generator**: "Compile" the AI's API plan into functional Node.js/Express endpoints. <br> - **Frontend Code Generator**: "Compile" the AI's UI plan into functional React components. <br> - **DB & Deployment Integration**: Auto-migrate the DB schema and deploy the full-stack app to a live preview URL on Render/Vercel. |
| **2. Orchestrator Enhancement** | - **Dynamic Task Generation**: Implement the core logic for the AI to decompose user requests into executable DAGs. <br> - **Dependency Management**: Build the system for managing dependencies between tasks in a plan. <br> - **Advanced Error Handling**: Implement robust retry, rollback, and recovery mechanisms. |
| **3. Feature Maturation** | - **Advanced AI Suggestions (v2)**: Introduce suggestions for SEO, performance, and content optimization. <br> - **Template Library**: Allow users to start from and save project templates. |
| **4. Platform Foundation** | - **Authentication & Payments**: Implement a secure auth system and integrate a payment gateway for monetization. <br> - **Sharing & QR Codes**: Add features to easily share published sites. |

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
