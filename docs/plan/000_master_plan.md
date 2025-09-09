# Navo Master Plan: The AI Project Orchestrator

**Motto:** Navo — Speak it, see it, ship it.

---

## 1. Executive Summary

### What is Navo?
Navo is a zero-code AI web/app builder that helps non-developers turn ideas into live products in minutes. It is an **AI Project Orchestrator Agent** that acts as a planner, project manager, developer, and engineer, transforming natural language requests into high-quality, production-ready applications.

### Who is it for?
- Small and medium business owners
- Creators and non-technical founders
- Marketers and operators who need to run fast experiments

### Why does it exist?
Most users care about visible, high-quality results, not the underlying technology. Navo's core mission is to reduce the time-to-value from weeks or months to minutes, allowing users to focus on their ideas, not the implementation details.

---

## 2. The Vision: The "Wow!" Moment

Our north star is to solve the core problem with today's AI tools: they produce simple outputs, not complete, well-crafted projects. We aim to create an AI that doesn't just generate code, but orchestrates the entire project lifecycle to deliver a final product that makes the user say, **"Wow, this is incredibly well-made!"**

To achieve this, the AI Agent embodies five key roles:

1.  **Strategic Planner**: Analyzes business goals and user needs to define project scope and strategy.
2.  **Project Manager**: Manages schedules, resources, and risks to ensure quality and on-time delivery.
3.  **Full-Stack Developer**: Designs the architecture and generates high-quality, secure, and optimized code.
4.  **Quality Assurance (QA) Engineer**: Conducts automated testing to ensure performance, security, and a flawless user experience.
5.  **DevOps Engineer**: Designs a scalable architecture and automates the entire CI/CD pipeline for one-click deployment.

---

## 3. Core Value Proposition

- **Speed & Quality**: Go from idea to a production-ready application in minutes, without compromising on quality.
- **Intelligence & Precision**: The AI understands user intent and context to make smart decisions throughout the development process.
- **Reliability & Trust**: Automated QA and a robust architecture ensure the final product is stable, secure, and dependable.

---

## 4. The User Journey: The Conversational Co-Pilot

Navo's core user experience is designed to feel like working with a highly competent co-pilot, not just using a tool. The AI's primary role is to guide the user from a simple idea to a concrete plan, and then execute that plan. This is achieved through a **Conversational Requirement Refinement** process.

The development cycle is as follows:

1.  **Phase 1: The Idea (The Vague Request)**: The user starts with a simple, high-level request, just as they would with a human expert.
    - *User: "I want to create a website to help people learn Korean."*

2.  **Phase 2: The Proposal (The AI as a Planner)**: Instead of asking for technical details, the AI analyzes the vague request and acts as a product planner. It proposes a concrete, well-structured plan for the user's approval.
    - *Navo: "Great idea! How about we start with these pages: a Homepage, a Hangul alphabet guide, a basic Grammar section, and a Vocabulary list. Does that sound like a good starting point?"*

3.  **Phase 3: The Feedback Loop (Refining the Plan)**: The user provides simple feedback on the AI's proposal. The AI incorporates the feedback and confirms the final plan.
    - *User: "That's good, but can you add a Quiz page too?"*
    - *Navo: "Excellent suggestion. I've added a Quiz page to the plan. Shall I proceed with building the structure for these five pages?"*

4.  **Phase 4: Scaffolding (Execution)**: Once the user approves the plan, the AI generates the complete file and directory structure (the "blueprint") in the Virtual File System (VFS).

5.  **Phase 5: Progressive Implementation (The Inner Loop)**: With the project structure in place, the user can then work on individual files in a tight, conversational loop:
    - **Focus**: The user selects a file (e.g., "Let's work on the Header").
    - **Implement & Refine**: The user describes what they want, and the AI generates and refines the code based on feedback.
    - **Save**: The user approves the final code, and the AI updates the file in the VFS.
    - **Iterate**: The user moves to the next file.

This approach ensures that non-technical users are never burdened with technical specifications. They only need to bring their idea; the AI co-pilot handles the rest, turning it into an actionable plan and a finished product.

---

## 5. High-Level Technical Direction

To realize this vision, Navo is built on a modern, AI-native architecture:

- **Frontend Strategy**: A unified, React-based codebase (Next.js) deployed on **Vercel** for optimal performance and user experience.
- **Backend Strategy**: A Node.js BFF (Backend for Frontend) deployed on **Render**, handling API requests and orchestrating deeper AI tasks. The primary database is Postgres, also hosted on Render.
- **Node-Graph Orchestration Model**: The AI's "thought process" is externalized into a Directed Acyclic Graph (DAG). The AI generates a plan, and a generic executor runs the plan, ensuring tasks are performed in the correct order, in parallel when possible.

---

## 5. Related Documents

- **For the detailed project timeline and milestones, see [./001_unified_roadmap.md](./001_unified_roadmap.md).**
- **For the core technical architecture, see [./002_architectural_vision.md](./002_architectural_vision.md).**
