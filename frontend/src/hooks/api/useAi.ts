import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';
import { handleUnauthorizedError } from '@/lib/handleApiError';

// --- Types ---

interface GenerateProjectPayload {
  projectName: string;
  projectDescription: string;
  context?: {
    activeView: string | null;
    activeFile: string | null;
    activePreviewRoute: string | null;
  };
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
  const { token, logout, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<GenerateProjectResponse, Error, GenerateProjectPayload>({
    mutationFn: async (data: GenerateProjectPayload) => {
      const workflowPayload = {
        prompt: data.projectDescription,
        chatHistory: [],
        context: data.context,
      };
      // Note: We are calling a general workflow endpoint.
      // The response might not be a standard project object.
      // The onSuccess handler in the component will manage the outcome.
      return await fetchApi<GenerateProjectResponse>(
        '/api/workflow/execute',
        {
          method: 'POST',
          body: JSON.stringify(workflowPayload),
          token,
        },
      );
    },
    onMutate: async (newProjectData) => {
      // Optimistically add the user's first message to the (not yet created) project's message cache
      const tempProjectId = `temp-${Date.now()}`;
      const queryKey = ['messages', tempProjectId];

      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData(queryKey);

      const newUserMessage = {
        id: `temp-msg-${Date.now()}`,
        role: 'user',
        content: newProjectData.projectDescription,
        createdAt: new Date().toISOString(),
        userId: user?.id,
        projectId: tempProjectId,
      };

      queryClient.setQueryData(queryKey, {
        pages: [{ messages: [newUserMessage], nextCursor: null }],
        pageParams: [undefined],
      });
      
      // Return context for rollback
      return { previousMessages, tempProjectId };
    },
    onError: (err, newProjectData, context: any) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', context.tempProjectId], context.previousMessages);
      }
      handleUnauthorizedError(err, logout);
    },
    onSuccess: (data, variables, context: any) => {
      // When the real project is created, invalidate the temporary query 
      // and the real project query to sync up.
      queryClient.invalidateQueries({ queryKey: ['messages', context.tempProjectId] });
      queryClient.invalidateQueries({ queryKey: ['messages', data.projectId] });
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
        handleUnauthorizedError(error, logout);
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
        handleUnauthorizedError(error, logout);
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
        handleUnauthorizedError(error, logout);
        throw error;
      }
    },
    ...options,
  });
}
