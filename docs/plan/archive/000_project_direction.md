# Navo Project Direction

**Document Version:** 1.0
**Created:** 2025-08-14
**Author:** vogo & ChatGPT (GPT-5)
**Status:** In Progress – Initial Project Direction

---

## 📑 Table of Contents

1. Introduction
2. Vision & Goals
3. Target Architecture
   - 3.1 Frontend Framework Strategy
   - 3.2 Backend (Go) Strategy
   - 3.3 Node-Graph Orchestration Model
4. LLM Integration Model
5. Deployment & DevOps Automation
6. Roadmap Integration
7. Maintenance & Document Evolution

---

## 1. Introduction

This document defines the initial direction for the **Navo** project, inspired by the Lovable platform but aiming for a broader vision: a web and app-friendly AI builder with one-click build and deployment capabilities.

The primary purpose is to align the team on:

- **What we are building**
- **Why we are building it**
- **How we plan to evolve the technical stack**

---

## 2. Vision & Goals

- **For Non-Developers:** Provide an environment where ideas expressed in natural language or visual manipulation can instantly materialize into functional web and mobile apps.
- **Beyond Lovable:** Integrate stronger mobile app support, advanced automated deployment, and a more scalable backend foundation.
- **Full Automation:** From [User Request] → [Code Update] → [Commit] → [Build] → [Deploy] without manual intervention.

---

## 3. Target Architecture

### 3.1 Frontend Framework Strategy

- **Requirement:** Unified codebase serving both web and mobile platforms.
- **Candidates:**
  - **React Native + Expo** → Strong mobile base, web support via Expo Web.
  - **Flutter Web** → Unified UI, strong performance, but larger learning curve.
  - **Capacitor/Tauri Hybrid** → Easy integration for existing React projects, native features for mobile/desktop.
- **Decision Direction:** Prefer a solution with robust mobile-first capabilities while maintaining high-quality web output.

---

### 3.2 Backend (Go) Strategy

- **Reason for Go:**
  - Inspired by Lovable’s migration from Python to Go for concurrency, startup speed, and binary distribution.
  - Go excels in handling concurrent tasks efficiently, suitable for AI task orchestration.
- **Implementation Considerations:**
  - Modular services for generation, deployment, analytics.
  - gRPC or HTTP API layer for frontend communication.
  - Designed for scalability and fast cold-starts.

---

### 3.3 Node-Graph Orchestration Model

- **Concept:** Represent app-building tasks as a Directed Acyclic Graph (DAG) where each node is a discrete step (e.g., “Generate Layout”, “Apply Style”, “Deploy”).
- **Benefits:**
  - Parallel execution of independent tasks.
  - Clear dependencies between steps.
  - Easier to debug and optimize.
- **Execution Engine:**
  - Inspired by Lovable’s DAG processing.
  - Context-aware execution (cancel, retry, cache).

---

## 4. LLM Integration Model

- **Prompt-to-Graph Conversion:**
  1. User provides natural language instruction.
  2. LLM interprets request and generates a task graph.
  3. Tasks are mapped to execution nodes in the DAG.
- **Execution Flow:**
  - Nodes may call LLMs (for code generation, text, image creation) or external services (build servers, deployment APIs).
  - Shared context and cache reduce redundant work.
- **Goal:** Minimize latency and maximize task reuse.

---

## 5. Deployment & DevOps Automation

- **Objective:** Seamless CI/CD triggered by AI-generated code changes.
- **Flow:**
  1. AI modifies project codebase.
  2. Automated commit to GitHub repository.
  3. Build pipeline triggers (GitHub Actions, Railway, Vercel, or custom runner).
  4. Deployment to target environment (Web, Mobile app store builds, CDN). For detailed strategy, refer to the [Platform Configuration & Deployment Strategy](../platform-deployment-strategy.md) document.

---

## 6. Roadmap Integration

This architecture and strategy integrate into **Phase 1 (MVP)** starting from Week 1:

- W1: Define DB schema, mock Project API, setup editor frame, and event collector skeleton.
- Future phases adapt to the chosen frontend/mobile strategy and Go backend.

---

## 7. Maintenance & Document Evolution

- This file is **000_project_direction.md** under `/docs/plan/`.
- Future, more detailed plans should be split into new numbered documents under `/docs/plan/`.
- Progress updates go to `/docs/progress/`.
- Major decision logs go to `/docs/decisions/`.

---
