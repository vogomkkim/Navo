import {
  useInfiniteQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';
import { ChatMessage, useIdeStore } from '@/store/ideStore';

// --- Types ---

interface GetMessagesResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
}

interface SendMessagePayload {
  prompt: string;
  chatHistory: ChatMessage[];
  projectId?: string; // Allow explicitly passing projectId
}

// --- Hooks ---

export function useGetMessages(projectId: string | null) {
  const { token, logout } = useAuth();
  return useInfiniteQuery<GetMessagesResponse, Error>({
    queryKey: ['messages', projectId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!projectId) return { messages: [], nextCursor: null };
      try {
        const url = `/api/projects/${projectId}/messages?limit=20${
          pageParam ? `&cursor=${pageParam}` : ''
        }`;
        return await fetchApi<GetMessagesResponse>(url, { token });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!projectId && !!token,
  });
}

export function useSendMessage(
  options?: UseMutationOptions<any, Error, SendMessagePayload>,
) {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<any, Error, SendMessagePayload>({
    mutationFn: async (data) => {
      // 1. Use projectId from payload if provided, otherwise get from store at runtime.
      const projectId = data.projectId || useIdeStore.getState().selectedProjectId;

      if (!projectId) {
        // This error will be caught by react-query's onError handler
        throw new Error('No project selected');
      }

      try {
        // 2. Remove projectId from the data sent to the backend to avoid duplication.
        const { projectId: _p, ...payload } = data;
        return await fetchApi(`/api/projects/${projectId}/messages`, {
          method: 'POST',
          body: JSON.stringify(payload),
          token,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      // 3. Invalidate queries using the same logic to ensure consistency.
      const projectId =
        variables.projectId || useIdeStore.getState().selectedProjectId;
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
      }
    },
    ...options,
  });
}