import { render, screen } from '@testing-library/react';
import Home from './page';
import { AuthProvider } from '@/app/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventTrackerProvider } from '@/app/context/EventTrackerContext';
import { ComponentDefinitionProvider } from '@/app/context/ComponentDefinitionContext';
import { LayoutProvider } from '@/app/context/LayoutContext';

// Mock the API hooks to avoid actual API calls during tests
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'), // Import and retain default behavior
  useListProjects: jest.fn(() => ({
    data: { projects: [] },
    isLoading: false,
    isError: false,
    error: null,
  })),
  usePageLayout: jest.fn(() => ({
    data: { layout: { components: [] } },
    isLoading: false,
    isError: false,
    error: null,
  })),
}));

// Mock next/navigation for useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
  })),
}));

// Mock the useAuth hook to avoid actual localStorage access and redirects
jest.mock('@/app/context/AuthContext', () => ({
  ...jest.requireActual('@/app/context/AuthContext'),
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
    token: 'test-token',
    login: jest.fn(),
    logout: jest.fn(),
  })),
}));

describe('Home Page', () => {
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
      </QueryClientProvider>
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
      </QueryClientProvider>
    );

    expect(
      await screen.findByRole('button', { name: /toggle panel/i })
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
      </QueryClientProvider>
    );

    expect(await screen.findByText('대기중')).toBeInTheDocument();
  });
});
