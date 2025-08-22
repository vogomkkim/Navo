# Code Fixer Agent Details

## 1. Purpose

To automatically identify and apply fixes to generated code based on issues detected by verification agents (e.g., `Execution Result Verification Agent`, `Plan-Result Consistency Verification Agent`). This agent is crucial for the self-correction aspect of the multi-agent system.

## 2. Inputs

*   **Problem Description:** Detailed information about the issue from the verification agent (e.g., syntax error, failed test case, semantic mismatch, error logs).
*   **Relevant Code Snippet(s):** The specific code block(s) where the problem was detected.
*   **Contextual Information:** File path, surrounding code, relevant configuration, and any other logs that might aid in diagnosis.
*   **Original Plan/Intent:** For semantic fixes, understanding the original design intent is critical.

## 3. Core Logic

### 3.1. Error Analysis (Refinement)

Even if the problem is identified by a verification agent, the Code Fixer Agent may perform its own refined analysis using an LLM to understand the root cause more deeply. This step aims to translate a symptom into a precise diagnosis.

### 3.2. Fix Generation

Utilize an LLM to propose code changes. This process involves:

*   **Correcting Syntax:** Fixing grammatical errors in the code.
*   **Adjusting API Calls:** Modifying parameters, endpoints, or handling of API responses.
*   **Modifying Component Logic:** Adjusting the internal logic of functions or components to meet requirements or fix bugs.
*   **Adding Missing Elements:** Inserting missing imports, dependencies, variable declarations, or function definitions.
*   **Refactoring:** Suggesting minor refactors for clarity or correctness if directly related to the error.

### 3.3. Fix Application

Apply the generated fix to the relevant file(s). This will primarily involve using the `replace` tool, ensuring precise targeting of the problematic code.

### 3.4. Self-Verification (Internal Loop)

After applying a fix, the Code Fixer Agent should ideally trigger a mini-verification loop to immediately check if the fix was successful. This could involve:

*   Re-running linting.
*   Re-compiling the affected module.
*   Re-running the specific failed test case(s).

## 4. Interaction with Retry Agent

*   **Success Signal:** If the Code Fixer Agent successfully applies a fix and its internal self-verification passes, it signals success to the Retry Agent. The Retry Agent can then proceed with the next step in the overall workflow (e.g., re-attempt deployment, re-run full test suite).
*   **Failure Signal:** If the Code Fixer Agent fails to apply a fix, or if its fix introduces new problems (detected by self-verification), it signals failure to the Retry Agent. The Retry Agent can then decide on further actions (e.g., try a different fix strategy, revert changes, escalate to human intervention).

## 5. Safety and Robustness Considerations

*   **Idempotency:** Fixes should ideally be idempotent, meaning applying them multiple times has the same effect as applying them once.
*   **Small, Atomic Changes:** Prefer small, focused changes to minimize the risk of introducing new issues.
*   **Pre-application Validation:** Before applying a fix, perform basic validation of the proposed change (e.g., check if the proposed change is syntactically valid, or if it matches expected patterns).
*   **Snapshot/Backup:** Before applying any fix, create a temporary snapshot or backup of the file(s) being modified.
*   **Rollback Capability:** Ensure the ability to easily revert changes made by the Code Fixer Agent if necessary, especially if a fix fails or introduces regressions.
*   **Human Oversight:** For critical fixes, after multiple failed automated attempts, or for complex semantic issues, escalate to human review and approval.
*   **Learning from Failures:** Log all fix attempts, their outcomes (success/failure), and the nature of the problem to improve future fix generation and analysis capabilities.
