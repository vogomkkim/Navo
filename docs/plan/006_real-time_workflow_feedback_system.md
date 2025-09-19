# Plan: Real-time Workflow Feedback System

**Version:** 1.0
**Status:** Implemented (Documentation of Existing Feature)

---

## 1. Executive Summary

This document describes the architecture of the real-time workflow feedback system. This system was identified as a critical undocumented feature that was already fully implemented in the codebase. The purpose of this document is to formally record its design and ensure it is recognized as a core component of the Orchestrator.

The system's primary goal is to provide end-users with immediate, granular feedback on the progress of their requests as the AI-driven workflow is executed. This is achieved by streaming events from the backend to the frontend via Server-Sent Events (SSE).

---

## 2. Core Component: The `connectionManager`

The heart of this system is the `connectionManager`, a singleton object exported from `server/src/modules/workflow/workflow.controller.ts`. It serves as a centralized, in-memory hub for managing all active SSE client connections.

### Responsibilities:

-   **Connection Tracking:** It maintains a `Map` where keys are `projectId`s and values are a `Set` of active SSE connection streams for that project.
-   **Client Management:** It provides simple methods (`addSse`, `removeSse`) for the SSE controller to register and unregister client connections as they are established or terminated.
-   **Broadcasting:** It exposes a `broadcast(projectId, message)` method that allows any part of the backend system to send a JSON message to all clients currently subscribed to a specific project.

---

## 3. Architecture: Event Flow

The event streaming architecture is straightforward and decoupled:

1.  **Client Connection:** The frontend establishes an SSE connection to the `/api/sse/projects/:projectId` endpoint. The controller authenticates the user and, upon success, registers the client's response stream with the `connectionManager` using the `projectId`.

2.  **Workflow Execution:** When a user's request triggers a workflow, the `WorkflowExecutor` (`workflowExecutor.ts`) begins executing the `Plan`.

3.  **Real-time Broadcasting:** As the `WorkflowExecutor` progresses through the `Plan`, it calls `connectionManager.broadcast(projectId, eventPayload)` at key moments:
    -   When the workflow starts (`workflow_started`).
    -   When a new execution level (a group of parallel steps) begins.
    -   When an individual step starts, completes, or fails (`workflow_progress`).
    -   When a level is completed (`workflow_level_completed`).
    -   When the entire workflow finishes successfully (`workflow_completed`) or fails (`workflow_failed`).

4.  **Frontend Reception:** The frontend listens for these events on the SSE stream and updates the UI accordingly, showing the user exactly what the AI is doing in real-time.

This architecture effectively decouples the event-producing component (`WorkflowExecutor`) from the event-consuming clients, using the `connectionManager` as a simple and efficient intermediary.
