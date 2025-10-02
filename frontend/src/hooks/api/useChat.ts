import {
  useInfiniteQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import { ChatMessage, useIdeStore } from "@/store/ideStore";
import { useWorkflowEvents } from "@/hooks/useWorkflowEvents";
import type { WorkflowResponse } from "@/types/workflow";

// --- 사용자 입력 히스토리 관리 (브라우저 콘솔 스타일) ---

const USER_INPUT_HISTORY_KEY = "navo_user_input_history";

interface UserInputHistoryData {
  [projectId: string]: string[];
}

// localStorage에서 사용자 입력 히스토리 불러오기
function loadUserInputHistory(): UserInputHistoryData {
  try {
    const stored = localStorage.getItem(USER_INPUT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn("사용자 입력 히스토리 불러오기 실패:", error);
    return {};
  }
}

// localStorage에 사용자 입력 히스토리 저장
function saveUserInputHistory(projectId: string, inputs: string[]): void {
  try {
    const history = loadUserInputHistory();
    history[projectId] = inputs;
    localStorage.setItem(USER_INPUT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn("사용자 입력 히스토리 저장 실패:", error);
  }
}

// 특정 프로젝트의 사용자 입력 히스토리 불러오기
function getProjectUserInputHistory(projectId: string): string[] {
  const history = loadUserInputHistory();
  return history[projectId] || [];
}

// 사용자 입력을 히스토리에 추가
function addUserInputToHistory(projectId: string, input: string): void {
  if (!input.trim()) return; // 빈 입력은 저장하지 않음

  const history = getProjectUserInputHistory(projectId);

  // 중복 제거 (같은 입력이 연속으로 들어오는 경우)
  if (history[0] !== input) {
    const newHistory = [input, ...history];

    // 최대 50개까지만 저장
    const limitedHistory = newHistory.slice(0, 50);

    saveUserInputHistory(projectId, limitedHistory);
  }
}

// 특정 프로젝트의 사용자 입력 히스토리 삭제
function clearProjectUserInputHistory(projectId: string): void {
  try {
    const history = loadUserInputHistory();
    delete history[projectId];
    localStorage.setItem(USER_INPUT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn("사용자 입력 히스토리 삭제 실패:", error);
  }
}

// 모든 사용자 입력 히스토리 삭제
function clearAllUserInputHistory(): void {
  try {
    localStorage.removeItem(USER_INPUT_HISTORY_KEY);
  } catch (error) {
    console.warn("전체 사용자 입력 히스토리 삭제 실패:", error);
  }
}

// --- Types ---

interface GetMessagesResponse {
  messages: {
    messages: ChatMessage[];
    nextCursor: string | null;
  };
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
  tempId?: string;
}

// --- Hooks ---

export function useGetMessages(projectId: string | null) {
  const { token, logout } = useAuth();
  return useInfiniteQuery<GetMessagesResponse, Error>({
    queryKey: ["messages", projectId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!projectId)
        return {
          messages: { messages: [], nextCursor: null },
          nextCursor: null,
        };
      try {
        const url = `/api/projects/${projectId}/messages?limit=20${
          pageParam ? `&cursor=${pageParam}` : ""
        }`;
        const response = await fetchApi<GetMessagesResponse>(url, { token });
        return response;
      } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
          logout();
        }
        throw error;
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.messages.nextCursor,
    enabled: !!projectId && !!token,
  });
}

export function useSendMessage(
  options?: UseMutationOptions<WorkflowResponse, Error, SendMessagePayload>
) {
  const { token, logout, user } = useAuth();
  const queryClient = useQueryClient();
  // SSE 연결은 ChatSection에서 관리하므로 여기서는 제거

  return useMutation<WorkflowResponse, Error, SendMessagePayload>({
    mutationFn: async (data) => {
      const projectId =
        data.projectId || useIdeStore.getState().selectedProjectId;
      if (!projectId) throw new Error("No project selected");

      // SSE 연결은 ChatSection에서 관리됨

      const { projectId: _projectId, ...payload } = data;
      void _projectId; // 사용하지 않는 변수 명시
      const response = await fetchApi<WorkflowResponse>(`/api/projects/${projectId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
        token,
      });

      return response;
    },
    onMutate: async (newMessage) => {
      const projectId =
        newMessage.projectId || useIdeStore.getState().selectedProjectId;
      const queryKey = ["messages", projectId];

      // 사용자 입력을 히스토리에 저장 (브라우저 콘솔 스타일)
      if (projectId) {
        addUserInputToHistory(projectId, newMessage.prompt);
      }

      // 즉시 실행될 쿼리를 취소하여 이전 서버 데이터가 낙관적 업데이트를 덮어쓰는 것을 방지
      await queryClient.cancelQueries({ queryKey });

      // 이전 메시지 목록을 스냅샷
      const previousMessages = queryClient.getQueryData(queryKey);

      // 새로운 메시지로 캐시를 낙관적으로 업데이트
      queryClient.setQueryData(queryKey, (oldData: unknown) => {
        const newUserMessage = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: "user",
          content: newMessage.prompt,
          createdAt: new Date().toISOString(),
          userId: user?.id,
          projectId,
        };

        if (!oldData || !(oldData as { pages?: unknown[] })?.pages) {
          return {
            pages: [
              {
                messages: {
                  messages: [newUserMessage],
                  nextCursor: null,
                },
                nextCursor: null,
              },
            ],
            pageParams: [undefined],
          };
        }

        const newData = { ...(oldData as { pages: unknown[] }) };
        const firstPage = (newData.pages[0] as {
          messages: { messages: unknown[] };
        }) || {
          messages: { messages: [] },
        };
        const updatedFirstPage = {
          ...firstPage,
          messages: {
            ...firstPage.messages,
            messages: [newUserMessage, ...firstPage.messages.messages],
          },
        };
        newData.pages[0] = updatedFirstPage;

        return newData;
      });

      // 에러 발생 시 롤백에 사용할 스냅샷 데이터 반환
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      const projectId =
        newMessage.projectId || useIdeStore.getState().selectedProjectId;
      // 뮤테이션 실패 시 스냅샷 데이터로 롤백
      if (
        context &&
        typeof context === "object" &&
        "previousMessages" in context &&
        context.previousMessages
      ) {
        queryClient.setQueryData(
          ["messages", projectId],
          context.previousMessages
        );
      }
      if (err instanceof Error && err.message === "Unauthorized") {
        logout();
      }
    },
    onSettled: (data, error, variables) => {
      const projectId =
        variables.projectId || useIdeStore.getState().selectedProjectId;

      // 성공/실패 여부와 관계없이 항상 서버 데이터와 동기화
      queryClient.invalidateQueries({ queryKey: ["messages", projectId] });
      if (options?.onSettled) {
        options.onSettled(data, error, variables, undefined);
      }
    },
    ...options,
  });
}

// --- 사용자 입력 히스토리 관리 함수들 export ---

export {
  getProjectUserInputHistory,
  clearProjectUserInputHistory,
  clearAllUserInputHistory,
  addUserInputToHistory,
};
