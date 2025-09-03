# Execution Engine: DAG + DI

This document explains the core execution engine of Navo, which uses a Directed Acyclic Graph (DAG) and Dependency Injection (DI) to run complex workflows efficiently and safely.

## Core Concepts

- **Node**: A small, independent job with defined inputs and outputs.
- **Graph (DAG)**: A collection of nodes with dependencies that form a graph without cyclical references. This allows for parallel execution of independent nodes.
- **DI (Dependency Injection)**: A pattern for providing shared services (like APIs, config, loggers) to nodes without them needing to manage instantiation.

## Why This Pattern?

- **Faster**: Run independent nodes in parallel to significantly speed up workflows.
- **Safer**: Isolate each step. A failure in one node doesn't necessarily halt the entire process, and nodes can be retried individually.
- **Extensible**: Easily add new functionality by creating a new node and linking it into the graph.
- **Observable**: Each node's execution can be logged, timed, and monitored independently.

## How It Works

1.  **Define Nodes**: Each node is defined with a `name`, its `dependencies` (a list of other node names), and a `run(context)` function.
2.  **Validate Graph**: Before execution, the system validates that the graph is a true DAG (no cycles) and calculates the topological order.
3.  **Execute**: The engine runs the nodes with maximum concurrency, respecting the dependency graph.
4.  **Store Outputs**: The output of each node is stored and made available to its downstream dependents.
5.  **Log & Report**: The engine logs the duration and outcome (success/failure) of each node and can surface this progress to the UI.

---

## Relationship to the Multi-Agent System

This DAG-based execution engine serves as the core **"Orchestrator Layer"** for the higher-level multi-agent system. While this document describes _how_ tasks are executed, the agent-related documents describe _who_ (the agents) decides what tasks to run.

- **Agents** (e.g., Planning Agent, Execution Agent) create a plan.
- That **plan** is represented as a DAG.
- This **DAG runner** executes the plan.

For more details on the agent architecture, see `docs/tech/agents/01-architecture.md`.

---

## Advanced Strategy: Transaction Management in DAGs (TODO)

### Overview

This section outlines the analysis and implementation plan for managing database transaction scope within the DAG-based multi-agent workflow.

### Current Situation

- **Problem**: A `UNIQUE constraint failed` error occurred during project recovery.
- **Cause**: The current implementation does not use database transactions, leading to partial data states on failure.
- **Context**: The DAG workflow involves agents running both sequentially and in parallel.

### Analysis of Transaction Strategies

#### 1. Global Transaction (Entire Workflow)
- **Pros**: Guarantees data consistency (all or nothing), simple recovery (full rollback).
- **Cons**: High rollback cost for late failures, long-lived transactions can cause performance and concurrency issues.

#### 2. Agent-Level Transaction (Per Node)
- **Pros**: Fine-grained control, allows for partial success, better performance due to shorter transactions, flexible retry logic for only the failed agent.
- **Cons**: Risk of data inconsistency if not managed carefully, requires complex state management.

#### 3. Hybrid Approach (Dependency-Based Grouping)
- **Concept**: Group nodes that are transactionally dependent into a single transaction.
- **Example**:
  ```typescript
  const transactionGroups = [
    ['ProjectArchitectAgent'], // Group 1: Independent
    ['CodeGeneratorAgent', 'DevelopmentGuideAgent'], // Group 2: Depends on Group 1
    ['RollbackAgent', 'DeploySiteAgent'], // Group 3: Final stage
  ];

  for (const group of transactionGroups) {
    await db.transaction(async (tx) => {
      for (const agentName of group) {
        await executeAgent(agentName, tx);
      }
    });
  }
  ```

### Recommended Direction

For a DAG-based workflow, **Agent-Level Transactions** or a **Hybrid Approach** is theoretically more suitable than a single global transaction. It aligns better with the parallel and independent nature of the nodes.

### Implementation Plan

-   **Phase 1 (Immediate Fix)**:
    -   [ ] Add logic to delete existing data on project recovery to prevent constraint violations.
    -   [ ] Apply agent-level transactions to the most critical data-writing agents.
-   **Phase 2 (Strategic Implementation)**:
    -   [ ] Analyze agent dependencies to define transaction groups.
    -   [ ] Implement a robust transaction grouping and execution logic.
    -   [ ] Build a state management system to track the progress of the workflow.
-   **Phase 3 (Advanced Features)**:
    -   [ ] Develop logic to manage partial success states.
    -   [ ] Implement a sophisticated retry mechanism for failed agents/groups.
    -   [ ] Clearly communicate the granular progress to the user.

### Status

-   **Current State**: TODO - Implementation Required
-   **Priority**: Medium (to be addressed after the current critical errors are resolved)
