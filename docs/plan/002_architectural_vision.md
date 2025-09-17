# Navo Architectural Vision

**Status:** Active

---

## 1. The Paradigm: An Autonomous, Tool-Based AI

Our architecture is designed to support our ultimate goal: **an AI that can build complete, production-ready applications from a natural language request.**

To do this, we are moving away from a rigid, hard-coded system to a flexible, AI-native paradigm built on three core concepts: **Tools, Plans, and a Generic Executor.**

### a. Tools: The Building Blocks of Capability
Every action the AI can perform is a **Tool**. A tool is a simple, stateless, and self-describing function that does one thing well.

- **Examples**: `run_shell_command`, `create_file`, `generate_database_schema`, `analyze_user_intent`.
- **Characteristics**:
    - **Single Responsibility**: Each tool has one clear purpose.
    - **Stateless**: It receives all required information via inputs and does not maintain its own state.
    - **Discoverable**: Each tool has a clear schema (name, description, inputs, outputs) that the AI can read and understand, allowing it to choose the right tool for a job.

### b. Plans: The AI's Thought Process
A **Plan** is the AI's "thought process" externalized into a structured data format (like JSON). It is a Directed Acyclic Graph (DAG) that defines which tools to run, in what order, and how to pass data between them.

The AI's primary role is not to *do* the work, but to **generate the plan**. It analyzes the user's request, selects the necessary tools from a registry, and wires them together into a comprehensive plan.

### c. The Generic Executor: The Engine
The orchestrator is a simple, generic engine. Its only job is to take a Plan and execute it.

- It traverses the graph, running the specified tools in the correct order.
- It manages the flow of data, passing the output of one tool as the input to the next.
- It is responsible for the low-level mechanics of execution, including error handling, retries, and logging.

---

## 2. System Stability and Self-Healing

A truly autonomous system must be resilient. The Generic Executor has a robust error-handling and self-healing capability built-in.

### a. Core Error Handling Strategies
- **Retries with Backoff**: For transient errors (e.g., network flakes), the executor will automatically retry failed tasks using an exponential backoff strategy.
- **Conditional Execution**: The Plan can define different paths based on the success or failure of a task, allowing for graceful fallbacks.
- **Structured Logging**: Every step of the execution is logged with a unique Trace ID, making it easy to debug and monitor the AI's actions.

### b. The Auto-Error Resolution System
When a critical error occurs (e.g., a runtime error in the generated code), a specialized meta-workflow is triggered:

1.  **Error Monitoring**: A global monitor catches the error and its context (stack trace, file, etc.).
2.  **AI Analysis**: An **Error Analyzer Agent** (a specialized Tool) is invoked. It uses an LLM to analyze the error and determine the root cause.
3.  **Code Fixing**: A **Code Fixer Agent** receives the analysis and generates a code patch to fix the issue.
4.  **Verification**: The patch is applied, and a **Test Runner Agent** verifies that the fix resolves the original error without introducing new ones.
5.  **Rollback**: If the fix fails verification, a **Rollback Agent** reverts the changes to restore the system to its last known good state.

---

## 3. Code Generation Strategy: Retrieval-Augmented Generation (RAG)

To ensure the AI generates code that adheres to our specific standards and best practices, we will not rely solely on the LLM's base knowledge. Instead, we will implement a **Retrieval-Augmented Generation (RAG)** strategy.

This approach addresses the critical challenge of context window limitations and ensures the AI is always equipped with the most relevant, up-to-date guidelines.

### a. The Problem: Context Limitations
- **Limited Context Window**: LLM prompts have a finite size. We cannot pass our entire set of development principles in every request.
- **Relevance Dilution**: Providing irrelevant guidelines for a specific task can confuse the LLM and degrade the quality of the output.

### b. The RAG Solution
The RAG workflow separates our knowledge from the generation process:

1.  **Knowledge Base Creation (Offline Process)**:
    - Our development standards, coding conventions, and architectural principles are maintained in a dedicated document (e.g., `docs/tech/development-principles.md`).
    - This document is parsed, split into meaningful chunks (e.g., "React Component Guidelines"), and converted into vector embeddings.
    - These embeddings are stored in a specialized **Vector Database**, creating a searchable knowledge base.

2.  **Intelligent Retrieval (Real-time Process)**:
    - When a user requests a code generation task (e.g., "Create a login form component"), the system first analyzes the request.
    - It converts the user's request into a vector embedding and uses it to query the Vector Database.
    - The database returns the most semantically relevant chunks of our documentation (e.g., the "React Component Guidelines" and "API Client Usage" chunks).

3.  **Augmented Prompting**:
    - The system then dynamically constructs a prompt for the LLM that includes the user's original request **plus** the specific, relevant guidelines retrieved from the knowledge base.
    - This ensures the LLM has the precise context it needs to generate high-quality, compliant code without being overwhelmed by irrelevant information.

This strategy allows us to maintain a comprehensive and evolving set of development principles while ensuring the AI can apply them effectively and efficiently.

---

## 4. Guiding Implementation Principles

To ensure the long-term health and scalability of the codebase, we adhere to the following principles (distilled from our backend refactoring efforts):

- **Vertical Slicing**: Code is organized by feature/domain (e.g., `modules/auth`, `modules/projects`), not by technical layer. This ensures high cohesion and low coupling.
- **Uni-directional Data Flow**: Within a module, dependencies flow in one direction: `Controller` → `Service` → `Repository`.
- **Strict Module Boundaries**: Modules cannot directly import from each other. Shared code (types, interfaces) must be placed in a shared package (`packages/shared`). These rules are enforced by ESLint.
- **Centralized Configuration**: All application-level configuration is managed in a dedicated `config` directory.

---

## 5. The Final Frontier: The Self-Extending AI

# Navo Architectural Vision

**Status:** Active

---

## 1. The Paradigm: An Autonomous, Tool-Based AI

Our architecture is designed to support our ultimate goal: **an AI that can build complete, production-ready applications from a natural language request.**

To do this, we are moving away from a rigid, hard-coded system to a flexible, AI-native paradigm built on three core concepts: **Tools, Plans, and a Generic Executor.**

### a. Tools: The Building Blocks of Capability
Every action the AI can perform is a **Tool**. A tool is a simple, stateless, and self-describing function that does one thing well.

- **Examples**: `run_shell_command`, `create_vfs_file`, `create_project_architecture`.
- **Characteristics**:
    - **Single Responsibility**: Each tool has one clear purpose.
    - **Stateless**: It receives all required information via inputs and does not maintain its own state.
    - **Discoverable**: Each tool has a clear schema (name, description, inputs, outputs) that the AI can read and understand, allowing it to choose the right tool for a job.

### b. Plans: The AI's Thought Process
A **Plan** is the AI's "thought process" externalized into a structured data format (JSON). It is a Directed Acyclic Graph (DAG) that defines which tools to run, in what order, and how to pass data between them. The AI's primary role is not to *do* the work, but to **generate the plan**.

### c. The Generic Executor: The Engine
The orchestrator is a simple, generic engine. Its only job is to take a Plan and execute it. It traverses the graph, running the specified tools in the correct order, managing data flow, and handling errors.

### d. Implementation Details
This paradigm is not just theoretical; it is actively implemented in the codebase:
- **Tool Definition & Registry**: Individual tools are defined in `server/src/modules/workflow/tools/` and registered in the `toolRegistry` via `server/src/modules/workflow/index.ts`.
- **Plan Generation**: The AI Planner logic resides within `server/src/modules/workflow/workflow.service.ts`, specifically in the `generatePlan` method. It uses tools like `create_project_architecture` (`projectArchitect.tool.ts`) to generate the core blueprint for the plan.
- **Execution Engine**: The `Generic Executor` is implemented as the `WorkflowExecutor` class in `server/src/modules/workflow/workflowExecutor.ts`.

---

## 2. Core Concept: The Blueprint as an Intermediate Representation (IR)

To achieve true platform independence (Web, Mobile, etc.), our core strategy revolves around a **framework-agnostic blueprint**. This blueprint serves as an **Intermediate Representation (IR)** of the application, describing *what* the app does, not *how* it is implemented in a specific framework.

- **The Blueprint (IR)**: This is a structured JSON object that defines the application's pages, components, layout, data flow, and user interactions in a neutral format. The primary tool responsible for generating this blueprint is `create_project_architecture`. The structure it produces (containing `pages`, `components`, and `file_structure`) serves as our canonical IR.

- **Compiler Tools**: A specialized category of tools acts as "compilers." These tools take the IR blueprint as input and generate platform-specific code. This approach allows Navo to support multiple target platforms from a single, unified blueprint.
    - **Example**: A `compile_blueprint_to_react` tool would read the IR and generate `.tsx` files for a Next.js project. In the future, a `compile_blueprint_to_flutter` tool could generate `.dart` files from the same IR.

This IR-based approach is the key to Navo's long-term vision of being a versatile, multi-platform application builder. It ensures that the core logic generated by the AI is reusable and not locked into a single technology stack.

---

## 3. Live Preview: The Interactive Canvas

A core feature of Navo is the Live Preview, which allows users to see and interact with their application in real-time. To deliver a truly powerful and competitive user experience, the preview must do more than just render UI; it must allow for testing of real functionality, including data fetching and mutations. This necessitates a shift from a completely isolated security model to a trust-based proxy architecture.

### a. The Challenge: Security vs. Functionality
- **Zero-Trust Model (Initial Approach):** The initial design prioritized maximum security by running user-generated code in a heavily sandboxed `iframe`. This perfectly isolated the preview from the main application, preventing any possibility of malicious code accessing user data or APIs. However, this came at the cost of functionality—the preview was a "showroom car with the engine off," unable to perform any real backend operations like fetching data or submitting forms.
- **The Market Requirement:** Competing platforms demonstrate that users expect a high-fidelity preview that mimics a real application. A preview limited to UI rendering is a significant competitive disadvantage.

### b. The Solution: Trust-Based Proxy Architecture
To bridge this gap, we adopt a **trust-based proxy architecture**. This model acknowledges that the primary user of the preview is the project's creator, who has a vested interest in the project's success rather than its failure.

The architecture works as follows:

1.  **Sandboxed `iframe`:** User code still runs inside a sandboxed `iframe` to prevent direct access to the parent window's DOM, cookies, or `localStorage`.
2.  **API Request Proxying:**
    - When the code inside the `iframe` attempts to make an API call (e.g., `fetch('/api/posts')`), it doesn't make the request directly.
    - Instead, it uses `postMessage` to send a structured message to the parent `VfsPreviewRenderer` component, detailing the API request (URL, method, body, etc.).
3.  **Parent as a Trusted Proxy:** The `VfsPreviewRenderer` component, running in the main application's trusted context, receives this message. It acts as a secure proxy:
    - It attaches the user's actual authentication token to the request.
    - It forwards the request to the Navo backend.
    - It receives the response from the backend.
    - It sends the response back to the `iframe` via `postMessage`.
4.  **API Allow-List for Security:** To mitigate the risk of malicious code abusing the proxy (e.g., calling a `deleteAllProjects` API), the proxy maintains a strict **API Allow-List**. Only requests matching predefined safe routes and methods (e.g., `GET /api/projects/:id/posts`) are forwarded. Any unauthorized requests are blocked at the proxy level.

This hybrid approach provides the best of both worlds: it empowers users with a fully functional, interactive preview while maintaining a robust security posture by validating all backend operations through a trusted and controlled proxy layer.

---

## 4. System Stability and Self-Healing
... (Content remains the same)
...

---

## 5. Code Generation Strategy: Retrieval-Augmented Generation (RAG)
... (Content remains the same)
...

---

## 6. Guiding Implementation Principles
... (Content remains the same)
...

---

## 7. The Final Frontier: The Self-Extending AI
... (Content remains the same)
...

