import { renderHook, waitFor } from '@testing-library/react';
import { useWorkflowEvents } from '../useWorkflowEvents';
import { useIdeStore } from '@/store/ideStore';
import { fetchSseTicket } from '@/lib/apiClient';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/store/ideStore');
vi.mock('@/lib/apiClient');
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    token: 'test-token',
  })),
}));

describe('useWorkflowEvents', () => {
  let mockSetWorkflowState: vi.Mock;
  let mockSetStepStatus: vi.Mock;
  let mockResetWorkflow: vi.Mock;

  beforeEach(() => {
    // Reset mocks
    mockSetWorkflowState = vi.fn();
    mockSetStepStatus = vi.fn();
    mockResetWorkflow = vi.fn();

    (useIdeStore as unknown as vi.Mock).mockReturnValue({
      setWorkflowState: mockSetWorkflowState,
      setStepStatus: mockSetStepStatus,
      resetWorkflow: mockResetWorkflow,
    });

    (fetchSseTicket as vi.Mock).mockResolvedValue({ ticket: 'test-ticket-123' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SSE Connection', () => {
    it('should fetch SSE ticket when projectId and token are available', async () => {
      renderHook(() => useWorkflowEvents('test-project-id'));

      await waitFor(() => {
        expect(fetchSseTicket).toHaveBeenCalledWith('test-token');
      });
    });

    it('should create EventSource with correct URL', async () => {
      const projectId = 'test-project-id';
      renderHook(() => useWorkflowEvents(projectId));

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledWith(
          expect.stringContaining(`/api/sse/projects/${projectId}?ticket=test-ticket-123`)
        );
      });
    });
  });

  // Other tests remain the same...
});
