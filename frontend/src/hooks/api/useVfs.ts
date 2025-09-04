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

interface VfsNode {
  id: string;
  name: string;
  nodeType: 'FILE' | 'DIRECTORY';
  updatedAt: string;
  metadata: {
    path?: string;
  };
  content?: string; // content can be optional
  projectId: string;
}

interface VfsNodesResponse {
  nodes: VfsNode[];
}

interface VfsNodeResponse {
  node: VfsNode;
}

interface UpdateVfsNodePayload {
  projectId: string;
  nodeId: string;
  content: string;
}

// --- Hooks ---

export function useListVfsNodes(
  projectId: string | null,
  parentId: string | null = null,
  options?: UseQueryOptions<VfsNodesResponse, Error>,
) {
  const { token, logout } = useAuth();
  return useQuery<VfsNodesResponse, Error>({
    queryKey: ['vfsNodes', projectId, parentId],
    queryFn: async () => {
      if (!projectId) return { nodes: [] };
      try {
        const url = parentId
          ? `/api/projects/${projectId}/vfs?parentId=${parentId}`
          : `/api/projects/${projectId}/vfs`;
        return await fetchApi<VfsNodesResponse>(url, { token });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    enabled: !!projectId && !!token,
    ...options,
  });
}

export function useVfsNodeContent(
  projectId: string | null,
  nodeId: string | null,
  options?: UseQueryOptions<VfsNodeResponse, Error>,
) {
  const { token, logout } = useAuth();
  return useQuery<VfsNodeResponse, Error>({
    queryKey: ['vfsNode', projectId, nodeId],
    queryFn: async () => {
      if (!projectId || !nodeId) {
        return { node: null } as any;
      }
      try {
        return await fetchApi<VfsNodeResponse>(
          `/api/projects/${projectId}/vfs/${nodeId}`,
          { token }
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
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['vfsNode', data.node.projectId, data.node.id],
        { node: data.node }
      );
    },
    ...options,
  });
}
