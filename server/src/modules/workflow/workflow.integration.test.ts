import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@/server'; // Assuming bootstrap exports a buildApp function

describe('Workflow API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Build the Fastify app instance before tests run
    app = await buildApp({ logger: false }); // Disable logger for cleaner test output
    await app.ready();
  });

  afterAll(async () => {
    // Close the app connection after all tests are done
    await app.close();
  });

  // A helper to get a valid auth token for a test user
  const getAuthToken = async (userId = 'test-user-id') => {
    // In a real app, you'd create a user and generate a token.
    // For this test, we'll assume a simple JWT signing utility exists.
    // This part might need adjustment based on the actual auth implementation.
    return app.jwt.sign({ userId });
  };

  /**
   * Test Suite 1: API Contract Test
   * As defined in docs/plan/010_phase_1_next_steps.md
   */
  describe('API Contract Test', () => {
    it('should return EXECUTION_STARTED or PROPOSAL_REQUIRED for a valid request', async () => {
      const token = await getAuthToken();
      const projectId = 'test-project-id';

      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/messages`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          prompt: 'Create a simple todo app',
          chatHistory: [],
          context: {},
        },
      });

      expect(response.statusCode).toBeOneOf([200, 202]);

      const payload = response.json();

      expect(payload.type).toBeOneOf(['EXECUTION_STARTED', 'PROPOSAL_REQUIRED']);

      if (payload.type === 'EXECUTION_STARTED') {
        expect(response.statusCode).toBe(202);
        expect(payload).toHaveProperty('runId');
        expect(payload).toHaveProperty('sseUrl');
        expect(payload).toHaveProperty('planSummary');
      } else { // PROPOSAL_REQUIRED
        expect(response.statusCode).toBe(200);
        expect(payload).toHaveProperty('proposalId');
        expect(payload).toHaveProperty('reasoning');
        expect(payload).toHaveProperty('confidence');
        expect(payload.confidence).toBeGreaterThanOrEqual(0);
        expect(payload.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  /**
   * Test Suite 2: Proposal Flow E2E Test
   * As defined in docs/plan/010_phase_1_next_steps.md
   */
  describe('Proposal Approval Flow', () => {
    it('should successfully complete the full proposal -> approve -> execute flow', async () => {
      // This test will require mocking the AI response to guarantee a proposal
      // For now, we'll just lay out the structure
      
      // 1. Send a vague prompt to trigger a proposal
      // 2. Assert the response is PROPOSAL_REQUIRED
      // 3. Extract proposalId
      // 4. Call /approve-proposal with the proposalId
      // 5. Assert the response is EXECUTION_STARTED
    });
  });

  /**
   * Test Suite 4: Security Test
   * As defined in docs/plan/010_phase_1_next_steps.md
   */
  describe('Proposal Security', () => {
    it('should return 403 when an unauthorized user tries to approve a proposal', async () => {
      // 1. User A creates a proposal
      // 2. User B gets a token
      // 3. User B tries to approve User A's proposalId
      // 4. Assert status code is 403
    });
  });

});
