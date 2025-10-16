import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react/pure';
import { vi } from 'vitest';

import { AuthProvider } from '@/app/context/AuthContext';
import { ComponentDefinitionProvider } from '@/app/context/ComponentDefinitionContext';
import { EventTrackerProvider } from '@/app/context/EventTrackerContext';
import { LayoutProvider } from '@/app/context/LayoutContext';

import Home from './page';

// Mock the API hooks to avoid actual API calls during tests
vi.mock('@/hooks/api', () => ({
  ...vi.importActual('@/hooks/api'), // Import and retain default behavior
  useListProjects: vi.fn(() => ({
    data: { projects: [] },
    isLoading: false,
    isError: false,
    error: null,
  })),
  usePageLayout: vi.fn(() => ({
    data: { layout: { components: [] } },
    isLoading: false,
    isError: false,
    error: null,
  })),
}));

// Mock next/navigation for useRouter
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    beforePopState: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    isFallback: false,
  })),
}));

// Mock the useAuth hook to avoid actual localStorage access and redirects
vi.mock('@/app/context/AuthContext', () => ({
  ...vi.importActual('@/app/context/AuthContext'),
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
    token: 'test-token',
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

describe.skip('Home Page', () => {
  it('renders the Navo Editor title', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LayoutProvider>
          <ComponentDefinitionProvider>
            <EventTrackerProvider>
              <AuthProvider>
                <Home />
              </AuthProvider>
            </EventTrackerProvider>
          </ComponentDefinitionProvider>
        </LayoutProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Navo — Editor (W1)')).toBeInTheDocument();
  });

  it('renders the Toggle Panel button', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LayoutProvider>
          <ComponentDefinitionProvider>
            <EventTrackerProvider>
              <AuthProvider>
                <Home />
              </AuthProvider>
            </EventTrackerProvider>
          </ComponentDefinitionProvider>
        </LayoutProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('button', { name: /toggle panel/i }),
    ).toBeInTheDocument();
  });

  it('renders the StatusDisplay component', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LayoutProvider>
          <ComponentDefinitionProvider>
            <EventTrackerProvider>
              <AuthProvider>
                <Home />
              </AuthProvider>
            </EventTrackerProvider>
          </ComponentDefinitionProvider>
        </LayoutProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('대기중')).toBeInTheDocument();
  });
});
