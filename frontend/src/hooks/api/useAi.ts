import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';

// --- Types ---

interface GenerateProjectPayload {
  projectName: string;
  projectDescription: string;
}

interface GenerateProjectResponse {
  ok: boolean;
  message: string;
  projectId: string;
  generatedStructure: unknown;
}

interface GenerateComponentPayload {
  description: string;
}

interface GenerateComponentResponse {
  ok: boolean;
  component: Record<string, unknown>;
}

type Suggestion = Record<string, unknown>;
interface SuggestionsResponse {
  suggestions: Suggestion[];
}

interface GenerateDummySuggestionResponse {
  ok: boolean;
  suggestion: Record<string, unknown>;
}

// --- Hooks ---

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
  options?: Omit<UseQueryOptions<SuggestionsResponse, Error>, 'queryKey' | 'queryFn'>,
) {
  const { token, logout } = useAuth();
  return useQuery<SuggestionsResponse, Error>({
    queryKey: ['suggestions'],
    queryFn: async () => {
      try {
        const url = `/api/ai/suggestions?limit=3`;
        return await fetchApi<SuggestionsResponse>(url, { token });
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

export function useGenerateDummySuggestion(
  options?: UseMutationOptions<GenerateDummySuggestionResponse, Error, void>,
) {
  const { token, logout } = useAuth();
  return useMutation<GenerateDummySuggestionResponse, Error, void>({
    mutationFn: async () => {
      try {
        return await fetchApi<GenerateDummySuggestionResponse>(
          '/api/ai/suggestions/dummy',
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
