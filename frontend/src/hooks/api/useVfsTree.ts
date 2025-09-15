import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchVfsTree, VfsTree } from '@/lib/apiClient';

export function useVfsTree(
  projectId: string,
  options: { includeContent?: boolean } = {},
) {
  const { token } = useAuth();
  const { includeContent = true } = options;

  // Get the previous data from the query cache to get the etag
  const previousData = useQuery<VfsTree>({
    queryKey: ['vfsTree', projectId, { includeContent }],
    enabled: false, // This query is just for getting the cached data
  }).data;

  return useQuery<VfsTree>({
    queryKey: ['vfsTree', projectId, { includeContent }],
    queryFn: async () => {
      if (!token) {
        throw new Error('Authentication token is not available.');
      }
      try {
        return await fetchVfsTree(projectId, token, {
          includeContent,
          etag: previousData?.version,
        });
      } catch (error) {
        // If the error is 'Not Modified', react-query will keep the stale data,
        // which is exactly what we want. For other errors, it will throw.
        if ((error as Error).message === 'Not Modified') {
          return previousData!;
        }
        throw error;
      }
    },
    enabled: !!token && !!projectId,
    // staleTime: 5 * 60 * 1000, // 5 minutes
    // refetchOnWindowFocus: false,
  });
}
