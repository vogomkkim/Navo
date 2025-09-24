"use client";

import { AuthProvider } from "@/app/context/AuthContext";
import { ComponentDefinitionProvider } from "@/app/context/ComponentDefinitionContext";
import { EventTrackerProvider } from "@/app/context/EventTrackerContext";
import { LayoutProvider } from "@/app/context/LayoutContext";
import { QueryClientWrapper } from "@/components/QueryClientWrapper";

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  return (
    <QueryClientWrapper>
      <AuthProvider>
        <LayoutProvider>
          <ComponentDefinitionProvider>
            <EventTrackerProvider>{children}</EventTrackerProvider>
          </ComponentDefinitionProvider>
        </LayoutProvider>
      </AuthProvider>
    </QueryClientWrapper>
  );
}
