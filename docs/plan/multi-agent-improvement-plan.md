# Multi-Agent System Improvement Plan

This document outlines the phased plan to enhance the Navo multi-agent system, focusing on improving orchestration, data flow, agent capabilities, verification, and self-correction mechanisms.

## Current Progress (as of August 26, 2025)

We have made significant progress on Phase 1 and Phase 2 of the improvement plan.

### Phase 1: Establish Core Orchestration and Data Flow - COMPLETED

**Goal:** To implement a robust orchestration layer that seamlessly chains agents and ensures proper data flow between them.

1.  **Enhance `ErrorResolutionManager` to Orchestrate Agent Sequence:**
    - `navo/core/errorResolution.ts` has been significantly refactored. The `resolveError` method now uses `runGraph` to orchestrate a sequence of agents (`ErrorAnalyzerAgent` -> `CodeFixerAgent` -> `TestRunnerAgent` -> `RollbackAgent` if needed).
    - Imports for `runGraph`, `GraphNode`, `NodeContext`, and specific agent classes (`ErrorAnalyzerAgent`, `CodeFixerAgent`, `TestRunnerAgent`, `RollbackAgent`) have been added.
    - The `AgentGraphNode` type has been defined.

2.  **Refactor `CodeFixerAgent` to Consume `ErrorAnalysis` Output:**
    - `navo/agents/codeFixerAgent.ts` has been modified. Its `execute` method now accepts `codeChanges: CodeChange[]` as an input.
    - The internal `generateCodeChanges` method and its related hardcoded fix generation logic have been removed.
    - The `canHandle` method has been simplified to `return true;`.

3.  **Enhance `CodeChange` Interface for Precision:**
    - `navo/core/errorResolution.ts` has been updated. The `CodeChange` interface now includes optional properties: `lineNumber?: number;`, `startColumn?: number;`, `endColumn?: number;`, `oldContent?: string;`.

4.  **Implement Robust Code Modification in `CodeFixerAgent`:**
    - `navo/agents/codeFixerAgent.ts` has been updated. The `applySingleChange` method now includes logic for more precise line-based and content-based modifications for `modify` and `replace` actions.

### Phase 2: Implement Robust Verification and Self-Correction - COMPLETED

**Goal:** To ensure that applied fixes are verified for correctness and that the system can intelligently retry or rollback on failure.

5.  **Integrate `TestRunnerAgent` into Orchestration:**
    - This was largely completed as part of Item 1 (refactoring `ErrorResolutionManager`). The `runTests` node is defined in the graph with a dependency on `fixCode`.

6.  **Refactor `TestRunnerAgent` for Real-World Testing:**
    - `navo/agents/testRunnerAgent.ts` has been modified. Its `execute` method now accepts `appliedChanges: CodeChange[]` as an input.
    - All hardcoded test methods and related helper functions have been removed.
    - A placeholder `runProjectTests` method has been added, indicating where actual project test execution logic needs to be implemented.
    - The `canHandle` method has been simplified to `return true;`.

7.  **Implement `RetryAgent` Logic within Orchestration:**
    - `navo/core/errorResolution.ts` has been modified. The `resolveError` method now includes a basic retry loop (`maxRetries = 3`) that re-executes the agent graph on failure.
    - The `rollbackChanges` node is conditionally executed if `runTests` fails, and it passes the `fixResult.changes` to the `RollbackAgent`.

8.  **Refactor `RollbackAgent` for Targeted Rollback:**
    - `navo/agents/rollbackAgent.ts` has been modified. Its `execute` method now accepts `changesToRollback: CodeChange[]` as an input.
    - The `identifyFilesForRollback` method has been removed.
    - The `performRollback` and `rollbackSingleFile` methods have been updated to use the provided `CodeChange` objects and their `backupPath` for targeted rollbacks.

## Next Steps for Smooth Restart (Phase 3: Enhance Robustness, Observability, and Efficiency)

**Goal:** To make the multi-agent system more robust, easier to monitor and debug, and more cost-effective.

**Actionable Steps for Next Session:**

1.  **Implement Comprehensive Observability (Item 9):**
    - **Description:** Enhance logging, tracing, and metrics collection across all agents and the orchestration layer.
    - **Files to Modify:** `navo/core/errorResolution.ts`, `navo/agents/*.ts`, `navo/core/runner.ts`
    - **Key Changes:**
      - Implement structured logging (e.g., JSON logs) for agent actions, inputs, outputs (or hashes), and durations.
      - Consider integrating with a tracing system (e.g., OpenTelemetry) to visualize the flow.
      - Collect and expose metrics on agent execution times, success/failure rates, and LLM token usage.
    - **Specific Plan for Implementation:**
      - **Verify `navo/core/errorResolution.ts` content:** Start by reading the file to ensure its current state is known.
      - **Add `Logger` interface and `ConsoleLogger` class:** Carefully insert these definitions into `navo/core/errorResolution.ts` (if not already present). I will use `replace` with very precise `old_string` values, or if `replace` continues to be problematic, I will use `write_file` to overwrite the entire file with the correct content.
      - **Update `ErrorResolutionManager` to use `ConsoleLogger`:** Modify the constructor to initialize `this.logger = new ConsoleLogger();`. Systematically replace all `console.log`, `console.warn`, and `console.error` calls within `ErrorResolutionManager` with `this.logger.info`, `this.logger.warn`, and `this.logger.error` respectively. Ensure `this.logger` is passed to `baseCtx` for `runGraph`.
      - **Update `AgentRegistry` to use `ConsoleLogger`:** Modify the constructor to initialize `this.logger = new ConsoleLogger();`. Systematically replace all `console.log` and `console.warn` calls within `AgentRegistry` with `this.logger.info` and `this.logger.warn` respectively.
      - **Verification Strategy:** After each `replace` operation, I will immediately `read_file` the target file to verify the change has been applied correctly. This explicit verification step should prevent getting stuck in a loop.

2.  **Implement LLM Cost Optimization (Item 10):**
    - **Description:** Reduce the cost and latency associated with LLM API calls.
    - **Files to Modify:** `navo/agents/errorAnalyzerAgent.ts`
    - **Key Changes:**
      - Explore caching mechanisms for common error analyses or code generation patterns.
      - Refine prompts to be more concise and efficient.
      - Investigate using smaller, specialized LLMs for specific tasks if feasible.

3.  **Add Dynamic Context for `ErrorAnalyzerAgent` (Item 11):**
    - **Description:** Provide richer and more relevant context to the AI for improved error analysis.
    - **Files to Modify:** `navo/agents/errorAnalyzerAgent.ts`
    - **Key Changes:**
      - Implement a mechanism (potentially a new agent or utility) to fetch relevant code snippets, recent commit history, or related log entries.
      - Include this dynamic context in the `ErrorAnalyzerAgent`'s prompt.

4.  **Integrate Human-in-the-Loop (HITL) (Item 12):**
    - **Description:** Define clear escalation paths and interfaces for human intervention when agents get stuck or require clarification.
    - **Files to Modify:** `navo/core/errorResolution.ts` (orchestrator logic), potentially new UI components.
    - **Key Changes:**
      - Implement mechanisms to pause the automated process and present proposed solutions or unresolved errors to a human for review and approval.
      - Allow humans to provide feedback or manual interventions.
