declare global {
  interface Window {
    API_BASE_URL?: string;
  }
}

const API_BASE_URL: string =
  typeof window !== 'undefined' && window.API_BASE_URL
    ? window.API_BASE_URL
    : '';

async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('navo_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({
        error: 'Request failed with status ' + response.status,
      }));
    throw new Error(errorData.error || 'API request failed');
  }

  return response.json() as Promise<T>;
}

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

interface SaveDraftResponse {
  ok: boolean;
  message: string;
  savedAt: string;
  versionId?: string; // Assuming versionId might be returned
}

interface SuggestionsResponse {
  suggestions: any[]; // Define a more specific type if available
}

interface ApplySuggestionResponse {
  suggestion: any; // Define a more specific type if available
}

interface ProjectListResponse {
  projects: any[]; // Define a more specific type if available
}

interface PageListResponse {
  pages: any[]; // Define a more specific type if available
}

interface PageLayoutResponse {
  layout: Layout;
}

interface GenerateProjectResponse {
  ok: boolean;
  message: string;
  projectId: string;
  generatedStructure: any; // Define a more specific type if available
}

interface ComponentListResponse {
  ok: boolean;
  components: any[]; // Define a more specific type if available
}

interface CreateComponentResponse {
  ok: boolean;
  message: string;
  component: any; // Define a more specific type if available
}

interface GenerateComponentResponse {
  ok: boolean;
  component: any; // Define a more specific type if available
}

interface AiCommandResponse {
  response: string;
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

interface TrackEventsResponse {
  success: boolean;
  count: number;
}

export const api = {
  getDraft: () => fetchApi<DraftResponse>('/api/draft'),
  saveDraft: (layout: Layout) =>
    fetchApi<SaveDraftResponse>('/api/save', {
      method: 'POST',
      body: JSON.stringify({ layout }),
    }),
  getSuggestions: (refresh: boolean = false): Promise<SuggestionsResponse> => {
    const url = new URL(`${API_BASE_URL}/api/suggestions`);
    if (refresh) {
      url.searchParams.set('refresh', 'true');
    }
    url.searchParams.set('limit', '3');
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('navo_token')}`,
      },
    }).then((res) => res.json());
  },
  applySuggestion: (suggestionId: string) =>
    fetchApi<ApplySuggestionResponse>(
      `/api/suggestions/${suggestionId}/apply`,
      { method: 'POST' }
    ),
  generateDummySuggestion: () =>
    fetchApi<any>('/api/generate-dummy-suggestion', { method: 'POST' }),
  listProjects: () => fetchApi<ProjectListResponse>('/api/projects'),
  listProjectPages: (projectId: string) =>
    fetchApi<PageListResponse>(`/api/projects/${projectId}/pages`),
  getPageLayout: (pageId: string) =>
    fetchApi<PageLayoutResponse>(`/api/pages/${pageId}`),
  generateProject: (data: any) =>
    fetchApi<GenerateProjectResponse>('/api/generate-project', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listComponents: () => fetchApi<ComponentListResponse>('/api/components'),
  createComponent: (data: any) =>
    fetchApi<CreateComponentResponse>('/api/components', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateComponent: (data: any) =>
    fetchApi<GenerateComponentResponse>('/api/components/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  aiCommand: (command: string, currentLayout: Layout) =>
    fetchApi<AiCommandResponse>('/api/ai-command', {
      method: 'POST',
      body: JSON.stringify({ command, currentLayout }),
    }),
  logError: (errorData: any) =>
    fetchApi<LogErrorResponse>('/api/log-error', {
      method: 'POST',
      body: JSON.stringify(errorData),
    }),
  trackEvents: (events: any[]) =>
    fetchApi<TrackEventsResponse>('/api/events', {
      method: 'POST',
      body: JSON.stringify({ events }),
    }),
};
