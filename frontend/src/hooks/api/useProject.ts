import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';

// --- Types ---

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

interface ProjectListResponse {
  projects: Project[];
}

interface RenameProjectPayload {
  projectId: string;
  name: string;
}

interface RenameProjectResponse {
  ok: boolean;
  project: { id: string; name: string };
}

interface DeleteProjectPayload {
  projectId: string;
}
type DeleteProjectResponse = unknown;


// --- Hooks ---

export function useListProjects(
  options?: Omit<
    UseQueryOptions<ProjectListResponse, Error>,
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
    enabled: !!token,
    ...options,
  });
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
    onMutate: async ({ projectId, name }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData<ProjectListResponse>(['projects']);
      queryClient.setQueryData<ProjectListResponse>(['projects'], (old) => {
        if (!old) return { projects: [] };
        return {
          projects: old.projects.map((p) =>
            p.id === projectId ? { ...p, name } : p
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['projects'], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
}

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
        return {};
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    onMutate: async ({ projectId }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData<ProjectListResponse>(['projects']);
      queryClient.setQueryData<ProjectListResponse>(['projects'], (old) => {
        if (!old) return { projects: [] };
        return { projects: old.projects.filter((p) => p.id !== projectId) };
      });
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['projects'], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
}
