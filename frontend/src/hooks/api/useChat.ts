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
}

// --- Hooks ---

export function useGetMessages(projectId: string | null) {
  const { token, logout } = useAuth();
  return useInfiniteQuery<GetMessagesResponse, Error>({
    queryKey: ['messages', projectId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!projectId) return { messages: [], nextCursor: null };
      try {
        const url = `/api/projects/${projectId}/messages?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`;
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
  const { selectedProjectId } = useIdeStore.getState();

  return useMutation<any, Error, SendMessagePayload>({
    mutationFn: async (data) => {
      if (!selectedProjectId) throw new Error('No project selected');
      try {
        return await fetchApi(`/api/projects/${selectedProjectId}/messages`, {
          method: 'POST',
          body: JSON.stringify(data),
          token,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedProjectId] });
    },
    ...options,
  });
}
