# Phase 1: Next Steps - Testing & Bug Fixes

**Date:** 2025-10-02
**Status:** 🔧 In Progress - Bug Fixes Applied
**Previous:** Phase 1.1 Complete (Propose-and-Approve + i18n)

---

## 📋 Progress Summary (Last Updated: 2025-10-02, End of Day)

### ✅ Completed Today:
1. **Phase 1.1 Implementation** - Fully complete and committed (Claude + Gemini collaboration)
2. **Preview Panel Bug Fix** - VFS CSS/JS serving issue resolved
   - **Problem:** Preview panel couldn't load `style.css` and `script.js` (500 errors)
   - **Solution:** Added `/api/preview/:projectId/files/*` endpoint + automatic asset path rewriting
   - **Files Modified:** `server/src/modules/preview/preview.controller.ts`
   - **Status:** ✅ Code complete, ready for testing after server restart

### ⏳ Next Session (Continue from here):
1. **Restart Backend Server** → `cd server && npm start`
2. **Execute E2E Test Scenarios** (Section "Execution Plan" → Step 1)
3. **Document Test Results** in this file
4. **Fix Any Remaining Bugs**
5. **Proceed to Automated Integration Tests** (Step 3)

### 📝 Key Files Modified:
- `server/src/modules/preview/preview.controller.ts` - VFS file serving + HTML path fixing
- `docs/plan/010_phase_1_next_steps.md` - Progress tracking

---

## Overview

Following Gemini's review and approval of Phase 1.1, we are proceeding with immediate testing and stability improvements before moving to Phase 2 (RAG).

---

## Execution Plan

### **Step 1: E2E User Testing (30min - 1hr)**
**Goal:** Validate the actual user experience with real scenarios.

#### Test Scenarios:
1. **Simple App Creation**
   - Input: "간단한 계산기 앱 만들어줘"
   - Expected: AI proposes a plan OR executes immediately
   - Verify: Proposal UI displays correctly (Korean), confidence badge shows

2. **Proposal Approval Flow**
   - Action: Click "승인" button
   - Expected: Workflow starts, SSE connection established
   - Verify: Real-time progress updates, step-by-step feedback

3. **Complex Request (Force Proposal)**
   - Input: "전자상거래 플랫폼을 만들어줘. 사용자 인증, 상품 관리, 장바구니, 결제 시스템이 필요해"
   - Expected: AI proposes (confidence < 0.7)
   - Verify: Detailed reasoning in Korean, multiple steps listed

4. **Proposal Rejection**
   - Action: Click "거부" button
   - Expected: Proposal disappears, no workflow starts
   - Verify: Clean state, no errors

#### Acceptance Criteria:
- ✅ All Korean messages display correctly
- ✅ SSE connection established without errors
- ✅ Proposal UI renders with confidence badge
- ✅ Approve/Reject buttons work as expected
- ✅ Workflow progress shows in real-time

#### Known Issues to Watch:
- ⚠️ Preview panel errors (500) - **expected, out of scope**
- ⚠️ VFS file rendering - **expected, separate feature**

---

### **Step 2: Bug Fixes (1-2hr)**
**Goal:** Fix immediate usability issues found in testing.

#### Priority 1: Critical Blockers
- Any errors that prevent workflow execution
- SSE connection failures
- Proposal approval/rejection failures

#### Priority 2: UX Issues
- ✅ **FIXED (2025-10-02):** Preview panel 500 errors (`style.css`, `script.js`)
  - **Root Cause:** Preview service not handling VFS files correctly
  - **Solution:** Added `/api/preview/:projectId/files/*` endpoint + `fixAssetPaths()` function
  - **Files Modified:** `server/src/modules/preview/preview.controller.ts`
  - **Status:** Code complete, server restart required for testing
- VFS file rendering in editor

#### Priority 3: Polish
- Loading states
- Error messages
- Edge case handling

---

### **Step 3: Automated Integration Tests (2-3hr)**
**Goal:** Implement Gemini's recommended test scenarios to prevent regressions.

#### Test Suite 1: API Contract Test
```typescript
describe('WorkflowResponse API Contract', () => {
  it('should return EXECUTION_STARTED or PROPOSAL_REQUIRED', async () => {
    const response = await POST('/api/projects/:projectId/messages', {
      prompt: "Create a todo app"
    });

    expect(response.type).toBeOneOf(['EXECUTION_STARTED', 'PROPOSAL_REQUIRED']);

    if (response.type === 'EXECUTION_STARTED') {
      expect(response).toHaveProperty('runId');
      expect(response).toHaveProperty('sseUrl');
      expect(response).toHaveProperty('planSummary');
    } else {
      expect(response).toHaveProperty('proposalId');
      expect(response).toHaveProperty('reasoning');
      expect(response).toHaveProperty('confidence');
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    }
  });
});
```

#### Test Suite 2: Proposal Flow E2E Test
```typescript
describe('Proposal Approval Flow', () => {
  it('should complete full proposal -> approve -> execute flow', async () => {
    // Step 1: Send vague prompt to trigger proposal
    const proposalResponse = await POST('/api/projects/:projectId/messages', {
      prompt: "Build an e-commerce platform with user authentication and payment"
    });

    expect(proposalResponse.type).toBe('PROPOSAL_REQUIRED');
    const { proposalId } = proposalResponse;

    // Step 2: Approve proposal
    const approveResponse = await POST('/api/projects/:projectId/workflow/approve-proposal', {
      proposalId
    });

    expect(approveResponse.type).toBe('EXECUTION_STARTED');
    expect(approveResponse.runId).toBeDefined();
    expect(approveResponse.sseUrl).toMatch(/^\/api\/sse\/projects\/.+\?ticket=.+$/);
  });
});
```

#### Test Suite 3: SSE Connection Test
```typescript
describe('SSE Connection', () => {
  it('should establish SSE connection and receive connected message', async (done) => {
    // Get ticket
    const { ticket } = await POST('/api/sse/ticket');

    // Establish SSE connection
    const eventSource = new EventSource(`/api/sse/projects/${projectId}?ticket=${ticket}`);

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'connected') {
        expect(message.projectId).toBe(projectId);
        eventSource.close();
        done();
      }
    };

    eventSource.onerror = (error) => {
      fail('SSE connection failed');
    };
  });
});
```

#### Test Suite 4: Security Test
```typescript
describe('Proposal Security', () => {
  it('should return 403 when unauthorized user tries to approve proposal', async () => {
    // User A creates proposal
    const proposalResponse = await POST('/api/projects/:projectId/messages', {
      prompt: "Complex request",
      token: userAToken
    });

    const { proposalId } = proposalResponse;

    // User B tries to approve User A's proposal
    const response = await POST('/api/projects/:projectId/workflow/approve-proposal', {
      proposalId,
      token: userBToken
    });

    expect(response.status).toBe(403);
    expect(response.type).toBe('ERROR');
    expect(response.errorCode).toBe('UNAUTHORIZED');
  });
});
```

---

## Implementation Assignments

### Claude's Responsibilities:
1. ✅ Execute E2E User Testing (Step 1)
2. ✅ Document findings and issues
3. ✅ Fix Priority 1 & 2 bugs (Step 2)
4. ✅ Implement frontend-related tests (Step 3)

### Gemini's Responsibilities:
1. ✅ Implement backend integration tests (Step 3)
2. ✅ Review test coverage
3. ✅ Provide guidance on bug fixes if needed

### Shared:
- ✅ Test execution and validation
- ✅ Documentation updates

---

## Success Criteria

### Step 1: E2E Testing
- [ ] All 4 test scenarios pass
- [ ] No critical bugs found
- [ ] User experience feels smooth

### Step 2: Bug Fixes
- [ ] Preview panel shows VFS files correctly
- [ ] No 500 errors in normal operation
- [ ] All edge cases handled gracefully

### Step 3: Automated Tests
- [ ] All 4 test suites implemented
- [ ] Tests pass consistently
- [ ] CI/CD integration (optional)

---

## Timeline

| Step | Duration | Owner | Status |
|------|----------|-------|--------|
| E2E User Testing | 30min-1hr | Claude | 🟡 Pending |
| Bug Fixes | 1-2hr | Claude | 🟡 Pending |
| Integration Tests | 2-3hr | Both | 🟡 Pending |
| **Total** | **~5hrs** | | |

---

## Communication Protocol

### For E2E Testing Results:
Claude will document findings in **Section 2: E2E Testing Results** below.

### For Bug Fixes:
Claude will list fixed issues in **Section 3: Bug Fixes Applied** below.

### For Test Implementation:
Both will update **Section 4: Test Implementation Status** below.

---

## Section 2: E2E Testing Results

**@Claude: Update this section after Step 1**

### Test Run Date: [Date]
### Tester: Claude

#### Scenario 1: Simple App Creation
- **Result:** [PASS/FAIL]
- **Notes:** [Your observations]
- **Issues Found:** [List issues or "None"]

#### Scenario 2: Proposal Approval Flow
- **Result:** [PASS/FAIL]
- **Notes:** [Your observations]
- **Issues Found:** [List issues or "None"]

#### Scenario 3: Complex Request
- **Result:** [PASS/FAIL]
- **Notes:** [Your observations]
- **Issues Found:** [List issues or "None"]

#### Scenario 4: Proposal Rejection
- **Result:** [PASS/FAIL]
- **Notes:** [Your observations]
- **Issues Found:** [List issues or "None"]

#### Overall Assessment:
- **Critical Issues:** [Count]
- **Minor Issues:** [Count]
- **User Experience Rating:** [1-5 stars]
- **Ready for Integration Tests:** [YES/NO]

---

## Section 3: Bug Fixes Applied

**@Claude: Update this section after Step 2**

### Bug Fix 1: [Title]
- **Issue:** [Description]
- **Root Cause:** [Explanation]
- **Fix:** [What was changed]
- **Files Changed:** [List files]
- **Tested:** [YES/NO]

### Bug Fix 2: [Title]
[... repeat as needed ...]

---

## Section 4: Test Implementation Status

**@Both: Update this section during Step 3**

| Test Suite | Status | Owner | Notes |
|------------|--------|-------|-------|
| API Contract Test | 🟡 Pending | Gemini | - |
| Proposal Flow E2E | 🟡 Pending | Gemini | - |
| SSE Connection Test | 🟡 Pending | Claude | - |
| Security Test | 🟡 Pending | Gemini | - |

---

## Next Steps After Completion

Once all 3 steps are complete:
1. ✅ Commit and push changes
2. ✅ Update `008_gemini_integration_roadmap.md` status
3. ✅ Begin planning Phase 2 (RAG)

---

**Created by:** Claude
**Date:** 2025-10-02
**Status:** 📋 Ready for Execution
**Next Action:** Claude to begin Step 1 (E2E User Testing)

---

## Section 5: Gemini's Implementation Log (End of Day Update)

**@Gemini: Update this section with your progress**

### Date: 2025-10-02
### Implementer: Gemini

#### Goal:
Implement backend integration tests (Step 3) in parallel with Claude's E2E testing.

#### Progress:
1.  ✅ **Test Scaffolding:** Created new test file `server/src/modules/workflow/workflow.integration.test.ts`.
2.  ✅ **Server Refactoring for Testability:**
    -   Refactored `server/src/server.ts` to export a `buildApp` function, allowing the Fastify instance to be imported without starting the server.
    -   Updated `server/src/bootstrap.ts` to use the new `buildApp` function.
    -   Updated the integration test file to correctly import and initialize the app.
3.  🟡 **Test Execution Blocked:** Attempted to run the initial test suite but encountered persistent errors with the `vitest` test runner.

#### Blocker Details: `vitest` Execution Failure
-   **Symptom:** Running `npm test -- workflow.integration.test.ts` or `npx vitest run ...` consistently fails with `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vitest'`.
-   **Root Cause Analysis:** The error seems related to how `vitest.config.ts` loads its own dependencies when executed by `npx` or `npm` scripts in our specific monorepo/ESM setup. It's a configuration issue, not a code issue.
-   **Attempts to Fix:**
    1.  `npm test ...` -> Failed.
    2.  `npx vitest run ...` -> Failed with the same error.
    3.  Modified `package.json` to include `npx` in the test script -> Failed.

#### Next Step for Next Session:
-   The immediate next action is to **resolve the `vitest` execution issue.**
-   **Planned Solution:** My next attempt will be to move `vitest` from `devDependencies` to `dependencies` in `server/package.json`. This should ensure the package is always available in the module resolution path, even in complex script execution contexts.
    1.  Run `npm uninstall vitest`.
    2.  Run `npm install vitest`.
    3.  Re-run `npm test -- workflow.integration.test.ts`.
-   Once the test runner is functional, I will proceed with implementing the three backend test suites as planned.

**Status:** 🟡 **BLOCKED** by test environment configuration.
