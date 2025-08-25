# Phase 2: Multi-Agent Integration Plan for Code Generation and Live Preview

This document details how the proposed multi-agent system principles will be integrated into Phase 2 of the Navo project, specifically focusing on the "Code Generation and Live Preview" workflow. The goal is to enhance reliability, enable automated self-correction, and ensure higher quality output.

## 1. Phase 2 Goal Recap

Transform AI-generated designs into live, functional applications with a preview URL.

## 2. Current Phase 2 Plan Breakdown (from `roadmap.md`)

- **W5: Project Scaffolding Implementation:**
  - Create basic file/directory structure.
  - Install dependencies (`npm install`).
- **W6: Backend API Code Generator Development:**
  - Generate Express routes/functions based on `structure.apiEndpoints`.
- **W7: Frontend UI Code Generator Development:**
  - Generate React components (`.tsx`) based on `structure.pages` and `structure.components`.
- **W8: Database Schema Auto-Execution & Deployment Integration:**
  - Execute `code.database` SQL schema.
  - Integrate with Vercel/Render APIs for programmatic environment creation and deployment.
  - Provide live preview URL.

## 3. Multi-Agent Integration Strategy for Phase 2 Workflows

The multi-agent architecture (NLP -> Plan -> Execute -> Verify -> Retry) will be applied to each major step of the "Code Generation and Live Preview" process.

### 3.1. Project Scaffolding (W5)

- **Enhanced Workflow:**
  1.  **Planning Agent:** Generates a detailed scaffolding plan (e.g., specific file contents, exact `package.json` structure) based on the AI-generated project structure.
  2.  **Execution Agent:** Executes file creation and `npm install` commands.
  3.  **Execution Result Verification Agent:**
      - **File System Check:** Verifies that all expected files and directories exist and have the correct basic structure/permissions.
      - **Dependency Check:** Runs `npm list` or similar to confirm all dependencies are installed correctly and without errors. Checks `package-lock.json` for consistency.
      - **Linting/Basic Compile Check:** Runs a quick lint or `tsc --noEmit` (if TypeScript) to catch immediate syntax errors in scaffolded files.
  4.  **Retry Agent:** If scaffolding fails (e.g., `npm install` error, file creation permission issue), the Retry Agent attempts to clean up and re-run, or escalates for human intervention.

### 3.2. Code Generation (W6: Backend API, W7: Frontend UI)

- **Enhanced Workflow:**
  1.  **Planning Agent:** Based on the AI's `structure.apiEndpoints`, `structure.pages`, `structure.components`, the Planning Agent generates a precise code generation plan (e.g., which files to create/modify, specific code snippets to insert). This plan is highly structured and machine-readable.
  2.  **Execution Agent (Code Generator):** This is the "compiler" itself. It takes the plan and writes the code.
  3.  **Execution Result Verification Agent:**
      - **Syntax Check:** Runs `tsc --noEmit` (for TypeScript), `eslint`, or relevant language linters/compilers on the _newly generated code_ to ensure it's syntactically correct and adheres to project standards.
      - **Basic Functionality Test (Unit/Integration):** For critical generated components/APIs, generates and runs very basic unit tests (e.g., API endpoint returns 200, React component renders without crashing). This could be a dedicated "Generated Test Agent."
  4.  **Plan-Result Consistency Verification Agent:**
      - **Semantic Check:** Determines if the generated code _semantically_ matches the intent of the AI's original design. This is the most challenging part and may require LLM-based analysis or sophisticated static analysis.
      - **Schema Compliance:** For DB-related code, verifies that generated queries/models align with the intended database schema.
  5.  **Retry Agent:** If code generation fails verification, the Retry Agent can adjust the prompt to the Code Generator, attempt alternative code generation strategies, or escalate if persistent errors.

### 3.3. Database Schema Auto-Execution & Deployment Integration (W8)

- **Enhanced Workflow:**
  1.  **Planning Agent:** Generates a detailed deployment plan (e.g., specific cloud provider commands, environment variable configurations, database migration steps).
  2.  **Execution Agent (Deployment Agent):** Executes database migrations/schema creation and interacts with Vercel/Render APIs to create environments and deploy code.
  3.  **Execution Result Verification Agent:**
      - **DB Connection Test:** Verifies the database is accessible and the schema is applied correctly (e.g., runs a simple query).
      - **Deployment Status Check:** Polls Vercel/Render APIs to confirm successful deployment and service health.
      - **Health Check Endpoint:** Hits a `/health` or similar endpoint on the deployed service to confirm it's running.
  4.  **Plan-Result Consistency Verification Agent:**
      - **Functional Test (End-to-End):** Runs a basic E2E test against the deployed preview URL to confirm core functionalities (e.g., user registration, page loading). This could be a dedicated "Deployed Test Agent."
      - **URL Accessibility:** Verifies the preview URL is publicly accessible and returns expected content.
  5.  **Retry Agent:** If deployment or post-deployment verification fails, the Retry Agent can attempt re-deployment, adjust deployment parameters, rollback to a previous stable state, or provide detailed error logs for human intervention.

## 4. Summary of Multi-Agent Benefits for Phase 2

- **Increased Reliability:** Errors are caught earlier in the pipeline (scaffolding, code generation) before deployment.
- **Automated Self-Correction:** Manual intervention is reduced through intelligent retries.
- **Higher Quality Output:** Ensures generated code is not just syntactically correct but also functionally sound and aligned with intent.
- **Faster Feedback Loop:** Automated verification provides immediate feedback on the success of each step.

## 5. Key Risks for Phase 2 (with Multi-Agent Integration)

1.  **LLM Reliability and Cost for Code Generation/Fixing:**
    - **Risk:** The quality of AI-generated code (from Code Generator) and AI-proposed fixes (from Code Fixer Agent) might be inconsistent, leading to frequent errors, requiring many retries, or producing suboptimal/insecure code. High volume of LLM calls could lead to prohibitive costs.
    - **Mitigation:** Implement strict validation and verification steps. Use smaller, fine-tuned models for specific tasks if possible. Implement caching for common code patterns. Monitor LLM usage and costs closely. Human-in-the-loop for complex or critical code sections.
2.  **Verification Agent Accuracy and Completeness:**
    - **Risk:** Verification agents might miss subtle errors (false negatives) or flag non-issues as errors (false positives), leading to incorrect fixes or unnecessary retries. Semantic verification is particularly challenging.
    - **Mitigation:** Develop comprehensive test suites for verification agents. Continuously refine verification logic. Prioritize critical checks first. Implement a feedback loop to improve verification accuracy based on human corrections.
3.  **Code Fixer Agent Introducing New Bugs (Regressions):**
    - **Risk:** Automated fixes, despite internal self-verification, could introduce new, harder-to-detect bugs or regressions in other parts of the codebase.
    - **Mitigation:** Emphasize small, atomic fixes. Implement robust pre-application validation. Maintain comprehensive test coverage (unit, integration, E2E) that runs after fixes. Implement strong rollback capabilities. Human review for high-impact fixes.
4.  **Infinite Retry Loops or Stuck States:**
    - **Risk:** The Retry Agent might get stuck in a loop trying to fix an unfixable problem, or agents might enter a state where they cannot proceed or recover.
    - **Mitigation:** Implement clear retry limits and back-off strategies. Define clear escalation paths to human intervention after a certain number of retries or specific error patterns. Implement robust state management and timeout mechanisms.
5.  **Performance Bottlenecks and Latency:**
    - **Risk:** The sequential nature of some multi-agent steps (Plan -> Execute -> Verify -> Fix -> Retry) and multiple LLM calls could lead to significant latency, impacting the "minutes to live" goal.
    - **Mitigation:** Optimize individual agent performance. Explore parallel execution where possible. Cache frequently used results. Optimize LLM prompts for faster responses. Prioritize critical path optimizations.
6.  **Integration Complexity and Tool Failures:**
    - **Risk:** Integrating multiple agents with various external tools (compilers, linters, cloud APIs, databases) can be complex and prone to failures (e.g., API rate limits, network issues, tool version mismatches).
    - **Mitigation:** Use robust error handling and retry mechanisms for tool interactions. Standardize tool versions. Implement comprehensive monitoring for all external integrations.
7.  **Security Risks in Automated Code Generation/Modification:**
    - **Risk:** AI-generated code or automated fixes could inadvertently introduce security vulnerabilities (e.g., injection flaws, insecure configurations, exposed secrets).
    - **Mitigation:** Implement security-focused verification agents (e.g., static application security testing - SAST). Conduct regular security audits of generated code. Ensure LLMs are trained on secure coding practices. Implement strict access controls for agents modifying code or deploying.
8.  **Data Consistency and Integrity Issues:**
    - **Risk:** During code generation, database schema execution, or deployment, data inconsistencies or integrity issues could arise if not handled carefully.
    - **Mitigation:** Implement transactional operations where possible. Use database migration tools with rollback capabilities. Perform data validation at multiple stages.

## 6. Next Steps

Following this detailed integration plan, the next steps will be to:

1.  Detail the "Code Fixer Agent" implementation, focusing on its role within these verification stages and its interaction with the Retry Agent.
2.  Identify key risks for Phase 2 based on this detailed multi-agent integration strategy.
