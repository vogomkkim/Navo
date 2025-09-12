import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';
import { useIdeStore } from '@/store/ideStore';

// --- Types ---

interface RunWorkflowPayload {
  plan: any; // This would be a typed Plan
  projectId?: string;
}

// --- Hooks ---

export function useRunWorkflow(
  options?: UseMutationOptions<any, Error, RunWorkflowPayload>,
) {
  const { token, logout } = useAuth();
  const setWorkflowState = useIdeStore((state) => state.setWorkflowState);

  return useMutation<any, Error, RunWorkflowPayload>({
    mutationFn: async (payload) => {
      try {
        setWorkflowState('running');
        const response = await fetchApi('/api/workflow/run', {
          method: 'POST',
          body: JSON.stringify(payload),
          token,
        });
        return response;
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        setWorkflowState('failed');
        throw error;
      }
    },
    ...options,
  });
}
