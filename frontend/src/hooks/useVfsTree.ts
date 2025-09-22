import { useQuery } from '@tanstack/react-query';
import { getVfsTree, VfsTree } from '@/lib/apiClient';
import { useAuth } from '@/app/context/AuthContext';

interface UseVfsTreeOptions {
  paths?: string[];
  includeContent?: boolean;
  enabled?: boolean;
}

export function useVfsTree(
  projectId: string | null,
  options: UseVfsTreeOptions = {},
) {
  const { token } = useAuth();
  const { paths, includeContent, enabled = true } = options;

  return useQuery<VfsTree, Error>({
    queryKey: ['vfs', projectId, { paths, includeContent }],
    queryFn: async () => {
      if (!projectId || !token) {
        throw new Error('Project ID and token are required to fetch VFS tree.');
      }
      return getVfsTree(projectId, token, { paths, includeContent });
    },
    enabled: !!projectId && !!token && enabled,
    // Keep previous data while refetching to prevent UI flickering
    placeholderData: (previousData) => previousData,
    // Stale time can be adjusted based on how fresh the data needs to be.
    // For a collaborative environment, a shorter stale time might be better.
    staleTime: 5 * 60 * 1000, // 5 minutes
    // 304 Not Modified responses from the server will be caught by fetchApi
    // and throw an error, which react-query handles correctly by keeping the
    // cached data and not re-rendering.
  });
}
