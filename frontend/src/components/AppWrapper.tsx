'use client';

import { AuthProvider } from '@/app/context/AuthContext';
import { EventTrackerProvider } from '@/app/context/EventTrackerContext';
import { ComponentDefinitionProvider } from '@/app/context/ComponentDefinitionContext';
import { LayoutProvider } from '@/app/context/LayoutContext';
import { QueryClientWrapper } from '@/components/QueryClientWrapper';

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  return (
    <QueryClientWrapper>
      <LayoutProvider>
        <ComponentDefinitionProvider>
          <EventTrackerProvider>
            <AuthProvider>{children}</AuthProvider>
          </EventTrackerProvider>
        </ComponentDefinitionProvider>
      </LayoutProvider>
    </QueryClientWrapper>
  );
}
