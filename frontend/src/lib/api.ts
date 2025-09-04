import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';

import { useAuth } from '@/app/context/AuthContext'; // Assuming @/app/context/AuthContext is the correct alias

// 상대 경로 사용(Next.js rewrites로 백엔드 프록시) → CORS 회피

interface FetchApiOptions extends RequestInit {
  token?: string | null;
}

async function fetchApi<T>(
  url: string,
  options: FetchApiOptions = {},
): Promise<T> {
  const { token, ...restOptions } = options;
  const headers: HeadersInit = {
    ...restOptions.headers,
  };

  // 본문이 있을 때만 JSON Content-Type을 기본 설정 (FormData는 제외)
  const hasBody = restOptions.body !== undefined && restOptions.body !== null;
  const isFormData =
    typeof FormData !== 'undefined' && restOptions.body instanceof FormData;
  if (hasBody && !isFormData) {
    (headers as Record<string, string>)['Content-Type'] =
      (headers as any)['Content-Type'] || 'application/json';
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = url; // 항상 상대 경로 사용

  // API 호출 로그 (개발 환경에서만)
  if (process.env.NODE_ENV !== 'production') {
    console.log('API 호출 시작:', {
      fullUrl,
      method: restOptions.method || 'GET',
      headers,
      body: restOptions.body,
      url,
    });
  }

  try {
    const response = await fetch(fullUrl, {
      ...restOptions,
      headers,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('API 응답 받음:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
    }

    if (response.status === 401) {
      // This should ideally be handled by a global interceptor or the AuthContext itself
      // For now, we'll just throw an error that the AuthContext can catch
      console.log('❌ 인증 실패 (401)');
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Request failed with status ' + response.status,
      }));
      console.log('❌ API 에러 응답:', errorData);
      throw new Error(errorData.error || 'API request failed');
    }

    const responseData = await response.json();
    console.log('✅ API 성공 응답:', responseData);
    return responseData as T;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API 호출 중 에러 발생:', {
        error: error instanceof Error ? error.message : String(error),
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        fullUrl,
        options: restOptions,
      });
    }
    throw error;
  }
}

// --- React Query Hooks for API Calls ---

// 멀티 에이전트 시스템 인터페이스
interface MultiAgentRequest {
  message: string;
  context?: {
    projectId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
  };
}

interface AgentResponse {
  success: boolean;
  message: string;
  agentName: string;
  status: 'thinking' | 'working' | 'completed' | 'error';
  data?: unknown;
  executionTime?: number;
  nextSteps?: string[];
}

interface MultiAgentResponse {
  success: boolean;
  agents: AgentResponse[];
  totalExecutionTime: number;
  summary: string;
}

// useGenerateDummySuggestion
interface GenerateDummySuggestionResponse {
  ok: boolean;
  message: string;
}

// useSuggestions
type Suggestion = Record<string, unknown>;
interface SuggestionsResponse {
  suggestions: Suggestion[];
}

// useGenerateProject
interface GenerateProjectPayload {
  projectName: string;
  projectDescription: string;
  // Add other fields if necessary, e.g., projectFeatures, targetAudience, businessType
}

interface GenerateProjectResponse {
  ok: boolean;
  message: string;
  projectId: string;
  generatedStructure: unknown;
}

export function useGenerateProject(
  options?: UseMutationOptions<
    GenerateProjectResponse,
    Error,
    GenerateProjectPayload
  >,
) {
  const { token, logout } = useAuth();
  return useMutation<GenerateProjectResponse, Error, GenerateProjectPayload>({
    mutationFn: async (data: GenerateProjectPayload) => {
      try {
        return await fetchApi<GenerateProjectResponse>(
          '/api/ai/generate-project',
          {
            method: 'POST',
            body: JSON.stringify(data),
            token,
          },
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    ...options,
  });
}

// useListProjects
interface Project {
  id: string;
  name: string;
  createdAt: string;
}

interface ProjectListResponse {
  projects: Project[];
}

export function useListProjects(
  options?: Omit<
    UseQueryOptions<ProjectListResponse, Error, ProjectListResponse, readonly unknown[]>,
    'queryKey' | 'queryFn'
  >,
) {
  const { token, logout } = useAuth();
  return useQuery<ProjectListResponse, Error>({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        return await fetchApi<ProjectListResponse>('/api/projects', { token });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    enabled: !!token, // 토큰이 있을 때만 쿼리 실행
    ...options,
  });
}

// useRenameProject - 프로젝트 이름 변경 훅
interface RenameProjectPayload {
  projectId: string;
  name: string;
}

interface RenameProjectResponse {
  ok: boolean;
  project: { id: string; name: string };
}

export function useRenameProject(
  options?: UseMutationOptions<
    RenameProjectResponse,
    Error,
    RenameProjectPayload
  >,
) {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<RenameProjectResponse, Error, RenameProjectPayload>({
    mutationFn: async ({ projectId, name }: RenameProjectPayload) => {
      try {
        return await fetchApi<RenameProjectResponse>(
          `/api/projects/${projectId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ name }),
            token,
          },
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ projectId, name }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData<ProjectListResponse>([
        'projects',
      ]);

      queryClient.setQueryData<ProjectListResponse>(['projects'], (old) => {
        if (!old) return { projects: [] };
        return {
          projects: old.projects.map((p) =>
            p.id === projectId ? { ...p, name } : p,
          ),
        };
      });

      return { previous } as { previous: ProjectListResponse | undefined };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as
        | { previous: ProjectListResponse | undefined }
        | undefined;
      if (ctx?.previous) {
        queryClient.setQueryData(['projects'], ctx.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
}

// useDeleteProject - 프로젝트 삭제 훅
interface DeleteProjectPayload {
  projectId: string;
}
type DeleteProjectResponse = unknown;

export function useDeleteProject(
  options?: UseMutationOptions<
    DeleteProjectResponse,
    Error,
    DeleteProjectPayload
  >,
) {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<DeleteProjectResponse, Error, DeleteProjectPayload>({
    mutationFn: async ({ projectId }: DeleteProjectPayload) => {
      try {
        await fetchApi<void>(`/api/projects/${projectId}`, {
          method: 'DELETE',
          token,
        });
        return {} as DeleteProjectResponse;
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    onMutate: async ({ projectId }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData<ProjectListResponse>([
        'projects',
      ]);
      queryClient.setQueryData<ProjectListResponse>(['projects'], (old) => {
        if (!old) return { projects: [] };
        return { projects: old.projects.filter((p) => p.id !== projectId) };
      });
      return { previous } as { previous: ProjectListResponse | undefined };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as
        | { previous: ProjectListResponse | undefined }
        | undefined;
      if (ctx?.previous) {
        queryClient.setQueryData(['projects'], ctx.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
}

// useListVfsNodes - 프로젝트의 VFS 노드 목록을 가져오는 훅
export interface VfsNode {
  id: string;
  name: string;
  nodeType: 'FILE' | 'DIRECTORY';
  updatedAt: string;
  metadata: {
    path?: string;
  };
  content?: string | null;
}

export interface VfsNodesResponse {
  nodes: VfsNode[];
}

export function useListVfsNodes(
  projectId: string,
  parentId: string | null = null,
  options?: Omit<
    UseQueryOptions<VfsNodesResponse, Error, VfsNodesResponse, readonly unknown[]>,
    'queryKey' | 'queryFn'
  >,
) {
  const { token, logout } = useAuth();
  return useQuery<VfsNodesResponse, Error>({
    queryKey: ['vfsNodes', projectId, parentId],
    queryFn: async () => {
      try {
        const url = parentId
          ? `/api/projects/${projectId}/vfs?parentId=${parentId}`
          : `/api/projects/${projectId}/vfs`;
        return await fetchApi<VfsNodesResponse>(url, {
          token,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    enabled: !!projectId && !!token, // projectId와 토큰이 모두 존재할 때만 쿼리 실행
    ...options,
  });
}

// useVfsNodeContent - 특정 VFS 노드의 내용을 가져오는 훅
export interface VfsNodeResponse {
  node: VfsNode;
}

export function useVfsNodeContent(
  projectId: string,
  nodeId: string | null,
  options?: Omit<
    UseQueryOptions<VfsNodeResponse, Error, VfsNodeResponse, readonly unknown[]>,
    'queryKey' | 'queryFn'
  >,
) {
  const { token, logout } = useAuth();
  return useQuery<VfsNodeResponse, Error>({
    queryKey: ['vfsNode', projectId, nodeId],
    queryFn: async () => {
      try {
        return await fetchApi<VfsNodeResponse>(
          `/api/projects/${projectId}/vfs/${nodeId}`,
          {
            token,
          },
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    enabled: !!projectId && !!nodeId && !!token,
    ...options,
  });
}

// useUpdateVfsNodeContent - VFS 노드의 내용을 업데이트하는 훅
interface UpdateVfsNodePayload {
  projectId: string;
  nodeId: string;
  content: string;
}

export function useUpdateVfsNodeContent(
  options?: UseMutationOptions<VfsNodeResponse, Error, UpdateVfsNodePayload>,
) {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<VfsNodeResponse, Error, UpdateVfsNodePayload>({
    mutationFn: async ({ projectId, nodeId, content }) => {
      try {
        return await fetchApi<VfsNodeResponse>(
          `/api/projects/${projectId}/vfs/${nodeId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ content }),
            token,
          },
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['vfsNode', variables.projectId, variables.nodeId],
        { node: data.node },
      );
    },
    ...options,
  });
}

// useGenerateComponent
interface GenerateComponentPayload {
  description: string;
}

interface GenerateComponentResponse {
  ok: boolean;
  component: Record<string, unknown>;
}

export function useGenerateComponent(
  options?: UseMutationOptions<
    GenerateComponentResponse,
    Error,
    GenerateComponentPayload
  >,
) {
  const { token, logout } = useAuth();
  return useMutation<
    GenerateComponentResponse,
    Error,
    GenerateComponentPayload
  >({
    mutationFn: async (data: GenerateComponentPayload) => {
      try {
        return await fetchApi<GenerateComponentResponse>(
          '/api/ai/components/generate',
          {
            method: 'POST',
            body: JSON.stringify(data),
            token,
          },
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    ...options,
  });
}

export function useSuggestions(
  options?: UseQueryOptions<SuggestionsResponse, Error>,
) {
  const { token, logout } = useAuth();
  return useQuery<SuggestionsResponse, Error>({
    queryKey: ['suggestions'],
    queryFn: async () => {
      try {
        const url = `/api/ai/suggestions?limit=3`; // Hardcoded limit for now
        return await fetchApi<SuggestionsResponse>(url, { token });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    enabled: !!token, // 토큰이 있을 때만 쿼리 실행
    ...options,
  });
}

export function useGenerateDummySuggestion(
  options?: UseMutationOptions<GenerateDummySuggestionResponse, Error, void>,
) {
  const { token, logout } = useAuth();
  return useMutation<GenerateDummySuggestionResponse, Error, void>({
    mutationFn: async () => {
      try {
        return await fetchApi<GenerateDummySuggestionResponse>(
          '/api/ai/generate-dummy-suggestion',
          {
            method: 'POST',
            token,
          },
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    ...options,
  });
}

// TODO: Migrate all other API calls from navo/web/modules/api.ts to useQuery/useMutation hooks
// This will be a continuous process as we migrate components that use these APIs.

// For now, we'll export the base fetchApi for direct use if needed, but prefer hooks.
// useTrackEvents
interface EventData {
  type: string;
  [key: string]: any; // Allow any other properties
}

interface TrackEventsResponse {
  success: boolean;
  count: number;
}

export function useTrackEvents(
  options?: UseMutationOptions<TrackEventsResponse, Error, EventData[]>,
) {
  const { token, logout } = useAuth();
  return useMutation<TrackEventsResponse, Error, EventData[]>({
    mutationFn: async (events: EventData[]) => {
      try {
        return await fetchApi<TrackEventsResponse>('/api/events', {
          method: 'POST',
          body: JSON.stringify({ events }),
          token,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    ...options,
  });
}

// useLogError
interface LogErrorPayload {
  type: string;
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  reason?: any; // For unhandled rejections
  promise?: Promise<any>; // For unhandled rejections
}

interface LogErrorResponse {
  success: boolean;
  logged: boolean;
  autoResolved?: boolean;
  error?: string;
  message?: string;
  changes?: number;
  nextSteps?: string[];
  fallback?: string;
}

export function useLogError(
  options?: UseMutationOptions<LogErrorResponse, Error, LogErrorPayload>,
) {
  const { token, logout } = useAuth();
  return useMutation<LogErrorResponse, Error, LogErrorPayload>({
    mutationFn: async (errorData: LogErrorPayload) => {
      try {
        return await fetchApi<LogErrorResponse>('/api/log-error', {
          method: 'POST',
          body: JSON.stringify(errorData),
          token,
        });
      } catch (error) {
        // Do not logout here, as logging errors should not cause a logout loop
        console.error('Failed to send error log:', error);
        throw error; // Re-throw to indicate mutation failure
      }
    },
    ...options,
  });
}

// usePageLayout - 페이지 레이아웃 데이터를 페치하는 훅
interface PageLayoutResponse {
  layout: {
    components: Array<{
      id: string;
      type: string;
      props: Record<string, unknown>;
    }>;
  };
}

export function usePageLayout(
  pageId: string,
  options?: Omit<
    UseQueryOptions<PageLayoutResponse, Error, PageLayoutResponse, readonly unknown[]>,
    'queryKey' | 'queryFn'
  >,
) {
  const { token, logout } = useAuth();
  return useQuery<PageLayoutResponse, Error>({
    queryKey: ['pageLayout', pageId],
    queryFn: async () => {
      try {
        return await fetchApi<PageLayoutResponse>(`/api/pages/${pageId}`, {
          token,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    enabled: !!pageId && !!token, // pageId와 토큰이 모두 존재할 때만 쿼리 실행
    ...options,
  });
}

// 멀티 에이전트 시스템 API (기존)
export function useMultiAgentSystem(
  options?: UseMutationOptions<MultiAgentResponse, Error, MultiAgentRequest>,
) {
  const { token } = useAuth();
  return useMutation({
    mutationFn: (data: MultiAgentRequest) =>
      fetchApi<MultiAgentResponse>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    ...options,
  });
}

// useExecuteWorkflow - 워크플로우 실행을 위한 훅
interface ExecuteWorkflowPayload {
  prompt: string;
}

interface ExecuteWorkflowResponse {
  // Define the expected response structure from the workflow execution
  plan: any;
  outputs: any;
}

export function useExecuteWorkflow(
  options?: UseMutationOptions<
    ExecuteWorkflowResponse,
    Error,
    ExecuteWorkflowPayload
  >,
) {
  const { token, logout } = useAuth();
  return useMutation<ExecuteWorkflowResponse, Error, ExecuteWorkflowPayload>({
    mutationFn: async (data) => {
      try {
        return await fetchApi<ExecuteWorkflowResponse>('/api/workflow/execute', {
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
    ...options,
  });
}

export { fetchApi };
