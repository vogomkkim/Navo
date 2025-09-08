import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';
import { handleUnauthorizedError } from '@/lib/handleApiError';
import { useIdeStore } from '@/store/ideStore';

// --- Types ---

export interface VfsNode {
  id: string;
  name: string;
  nodeType: 'FILE' | 'DIRECTORY';
  updatedAt: string;
  metadata: {
    path?: string;
  };
  content?: string;
  projectId: string;
  parentId: string | null;
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

// --- New Types for CRUD ---
interface CreateVfsNodePayload {
  projectId: string;
  parentId: string | null;
  name: string;
  nodeType: 'FILE' | 'DIRECTORY';
}

interface RenameVfsNodePayload {
  projectId: string;
  nodeId: string;
  name: string;
}

interface DeleteVfsNodePayload {
  projectId: string;
  nodeId: string;
  parentId: string | null; // Needed for cache invalidation
}

// --- Hooks ---

const vfsNodesQueryKey = (projectId: string | null, parentId: string | null = null) => [
  'vfsNodes',
  { projectId, parentId },
];

export function useListVfsNodes(
  projectId: string | null,
  parentId: string | null = null,
  options?: Omit<UseQueryOptions<VfsNodesResponse, Error>, 'queryKey' | 'queryFn'>,
) {
  const { token, logout } = useAuth();
  return useQuery<VfsNodesResponse, Error>({
    queryKey: vfsNodesQueryKey(projectId, parentId),
    queryFn: async () => {
      if (!projectId) return { nodes: [] };
      try {
        const url = parentId
          ? `/api/projects/${projectId}/vfs?parentId=${parentId}`
          : `/api/projects/${projectId}/vfs`;
        return await fetchApi<VfsNodesResponse>(url, { token });
      } catch (error) {
        handleUnauthorizedError(error, logout);
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
  options?: Omit<UseQueryOptions<VfsNodeResponse, Error>, 'queryKey' | 'queryFn'>,
) {
  const { token, logout } = useAuth();
  return useQuery<VfsNodeResponse, Error>({
    queryKey: ['vfsNode', { projectId, nodeId }],
    queryFn: async () => {
      if (!projectId || !nodeId) return { node: null } as any;
      try {
        return await fetchApi<VfsNodeResponse>(
          `/api/projects/${projectId}/vfs/${nodeId}`,
          { token },
        );
      } catch (error) {
        handleUnauthorizedError(error, logout);
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
        handleUnauthorizedError(error, logout);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['vfsNode', { projectId: data.node.projectId, nodeId: data.node.id }],
        { node: data.node },
      );
    },
    ...options,
  });
}

// --- New CRUD Hooks ---

export function useCreateVfsNode(
  options?: UseMutationOptions<VfsNodeResponse, Error, CreateVfsNodePayload>,
) {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<VfsNodeResponse, Error, CreateVfsNodePayload>({
    mutationFn: async ({ projectId, ...body }) => {
      try {
        return await fetchApi<VfsNodeResponse>(
          `/api/projects/${projectId}/vfs`,
          {
            method: 'POST',
            body: JSON.stringify(body),
            token,
          },
        );
      } catch (error) {
        handleUnauthorizedError(error, logout);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: vfsNodesQueryKey(variables.projectId, variables.parentId),
      });
    },
    ...options,
  });
}

export function useRenameVfsNode(
  options?: UseMutationOptions<VfsNodeResponse, Error, RenameVfsNodePayload>,
) {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<VfsNodeResponse, Error, RenameVfsNodePayload>({
    mutationFn: async ({ projectId, nodeId, name }) => {
      try {
        return await fetchApi<VfsNodeResponse>(
          `/api/projects/${projectId}/vfs/${nodeId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ name }),
            token,
          },
        );
      } catch (error) {
        handleUnauthorizedError(error, logout);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all nodes as parentId is not available here
      queryClient.invalidateQueries({ queryKey: ['vfsNodes'] });
    },
    ...options,
  });
}

export function useDeleteVfsNode(
  options?: UseMutationOptions<void, Error, DeleteVfsNodePayload>,
) {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteVfsNodePayload>({
    mutationFn: async ({ projectId, nodeId }) => {
      try {
        await fetchApi<void>(`/api/projects/${projectId}/vfs/${nodeId}`, {
          method: 'DELETE',
          token,
        });
      } catch (error) {
        handleUnauthorizedError(error, logout);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: vfsNodesQueryKey(variables.projectId, variables.parentId),
      });

      // Sync with IDE state at runtime
      const { activeFile, closeOpenFile, setActiveFile } = useIdeStore.getState();
      closeOpenFile(variables.nodeId);
      if (activeFile === variables.nodeId) {
        setActiveFile(null);
      }
    },
    ...options,
  });
}