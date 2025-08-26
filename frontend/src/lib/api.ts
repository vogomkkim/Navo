import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext'; // Assuming @/app/context/AuthContext is the correct alias

// Define a base URL for your API. This should be configured via environment variables in Next.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'; // Default to localhost

interface FetchApiOptions extends RequestInit {
  token?: string | null;
}

async function fetchApi<T>(url: string, options: FetchApiOptions = {}): Promise<T> {
  const { token, ...restOptions } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...restOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...restOptions,
    headers,
  });

  if (response.status === 401) {
    // This should ideally be handled by a global interceptor or the AuthContext itself
    // For now, we'll just throw an error that the AuthContext can catch
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Request failed with status ' + response.status,
    }));
    throw new Error(errorData.error || 'API request failed');
  }

  return response.json() as Promise<T>;
}

// --- React Query Hooks for API Calls ---

// Example: useDraft
interface Layout {
  components: any[]; // Define a more specific type if available
}

interface DraftResponse {
  ok: boolean;
  draft: {
    id: string;
    layout: Layout;
    lastModified: string;
  };
  tookMs: number;
}

export function useDraft(options?: UseQueryOptions<DraftResponse, Error>) {
  const { token, logout } = useAuth();
  return useQuery<DraftResponse, Error>({
    queryKey: ['draft'],
    queryFn: async () => {
      try {
        return await fetchApi<DraftResponse>('/api/draft', { token });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout(); // Log out if unauthorized
        }
        throw error;
      }
    },
    ...options,
  });
}

// Example: useSaveDraft
interface SaveDraftResponse {
  ok: boolean;
  message: string;
  savedAt: string;
  versionId?: string;
}

export function useSaveDraft(options?: UseMutationOptions<SaveDraftResponse, Error, Layout>) {
  const { token, logout } = useAuth();
  return useMutation<SaveDraftResponse, Error, Layout>({
    mutationFn: async (layout: Layout) => {
      try {
        return await fetchApi<SaveDraftResponse>('/api/save', {
          method: 'POST',
          body: JSON.stringify({ layout }),
          token,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          logout(); // Log out if unauthorized
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
export { fetchApi };