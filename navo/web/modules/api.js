const API_BASE_URL = window.API_BASE_URL || '';

async function fetchApi(url, options = {}) {
    const token = localStorage.getItem('navo_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed with status ' + response.status }));
        throw new Error(errorData.error || 'API request failed');
    }

    return response.json();
}

export const api = {
    getDraft: () => fetchApi('/api/draft'),
    saveDraft: (layout) => fetchApi('/api/save', { method: 'POST', body: JSON.stringify({ layout }) }),
    getSuggestions: (refresh = false) => {
        const url = new URL(`${API_BASE_URL}/api/suggestions`);
        if (refresh) {
            url.searchParams.set('refresh', 'true');
        }
        url.searchParams.set('limit', '3');
        return fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('navo_token')}` } }).then(res => res.json());
    },
    applySuggestion: (suggestionId) => fetchApi(`/api/suggestions/${suggestionId}/apply`, { method: 'POST' }),
    generateDummySuggestion: () => fetchApi('/api/generate-dummy-suggestion', { method: 'POST' }),
    listProjects: () => fetchApi('/api/projects'),
    listProjectPages: (projectId) => fetchApi(`/api/projects/${projectId}/pages`),
    getPageLayout: (pageId) => fetchApi(`/api/pages/${pageId}`),
    generateProject: (data) => fetchApi('/api/generate-project', { method: 'POST', body: JSON.stringify(data) }),
    listComponents: () => fetchApi('/api/components'),
    createComponent: (data) => fetchApi('/api/components', { method: 'POST', body: JSON.stringify(data) }),
    generateComponent: (data) => fetchApi('/api/components/generate', { method: 'POST', body: JSON.stringify(data) }),
    aiCommand: (command, currentLayout) => fetchApi('/api/ai-command', { method: 'POST', body: JSON.stringify({ command, currentLayout }) }),
    logError: (errorData) => fetchApi('/api/log-error', { method: 'POST', body: JSON.stringify(errorData) }),
    trackEvents: (events) => fetchApi('/api/events', { method: 'POST', body: JSON.stringify({ events }) }),
};
