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
  context?: {
    activeView: string | null;
    activeFile: string | null;
    activePreviewRoute: string | null;
  };
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
  const { token, logout, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<any, Error, SendMessagePayload>({
    mutationFn: async (data) => {
      const projectId = data.projectId || useIdeStore.getState().selectedProjectId;
      if (!projectId) throw new Error('No project selected');

      const { projectId: _p, ...payload } = data;
      return await fetchApi(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      });
    },
    onMutate: async (newMessage) => {
      const projectId = newMessage.projectId || useIdeStore.getState().selectedProjectId;
      const queryKey = ['messages', projectId];

      // 즉시 실행될 쿼리를 취소하여 이전 서버 데이터가 낙관적 업데이트를 덮어쓰는 것을 방지
      await queryClient.cancelQueries({ queryKey });

      // 이전 메시지 목록을 스냅샷
      const previousMessages = queryClient.getQueryData<any>(queryKey);

      // 새로운 메시지로 캐시를 낙관적으로 업데이트
      queryClient.setQueryData(queryKey, (oldData: any) => {
        const newUserMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: newMessage.prompt,
          createdAt: new Date().toISOString(),
          userId: user?.id,
          projectId,
        };

        if (!oldData || !oldData.pages) {
          return {
            pages: [{ messages: [newUserMessage], nextCursor: null }],
            pageParams: [undefined],
          };
        }

        const newData = { ...oldData };
        const firstPage = newData.pages[0] || { messages: [] };
        const updatedFirstPage = {
          ...firstPage,
          messages: [newUserMessage, ...firstPage.messages],
        };
        newData.pages[0] = updatedFirstPage;
        return newData;
      });

      // 에러 발생 시 롤백에 사용할 스냅샷 데이터 반환
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      const projectId = newMessage.projectId || useIdeStore.getState().selectedProjectId;
      // 뮤테이션 실패 시 스냅샷 데이터로 롤백
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', projectId], context.previousMessages);
      }
      if (err instanceof Error && err.message === 'Unauthorized') {
        logout();
      }
    },
    onSettled: (data, error, variables) => {
      const projectId = variables.projectId || useIdeStore.getState().selectedProjectId;
      // 성공/실패 여부와 관계없이 항상 서버 데이터와 동기화
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
      if (options?.onSettled) {
        options.onSettled(data, error, variables, undefined);
      }
    },
    ...options,
  });
}
