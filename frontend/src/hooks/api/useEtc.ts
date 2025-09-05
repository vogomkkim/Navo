import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';

// --- Types ---
// ... (Types for events, errors, layouts would go here)

// --- Hooks ---

export function useTrackEvents(
  options?: UseMutationOptions<any, Error, any[]>,
) {
  const { token, logout } = useAuth();
  return useMutation<any, Error, any[]>({
    mutationFn: async (events: any[]) => {
      try {
        return await fetchApi('/api/events', {
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

export function useLogError(
  options?: UseMutationOptions<any, Error, any>,
) {
  const { token } = useAuth();
  return useMutation<any, Error, any>({
    mutationFn: async (errorData: any) => {
      try {
        return await fetchApi('/api/log-error', {
          method: 'POST',
          body: JSON.stringify(errorData),
          token,
        });
      } catch (error) {
        console.error('Failed to send error log:', error);
        throw error;
      }
    },
    ...options,
  });
}

export function usePageLayout(
  pageId: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
) {
  const { token, logout } = useAuth();
  return useQuery<any, Error>({
    queryKey: ['pageLayout', pageId],
    queryFn: async () => {
      try {
        return await fetchApi(`/api/pages/${pageId}`, { token });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout();
        }
        throw error;
      }
    },
    enabled: !!pageId && !!token,
    ...options,
  });
}
