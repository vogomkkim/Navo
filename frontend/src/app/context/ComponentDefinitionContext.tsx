'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import { useListComponents } from '@/lib/api';
import { useAuth } from './AuthContext';

interface ComponentDef {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  category?: string;
  props_schema?: Record<string, unknown>;
  render_template?: string;
  css_styles?: string;
  is_active?: boolean;
}

interface ComponentDefinitionContextType {
  componentRegistry: Map<string, ComponentDef>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const ComponentDefinitionContext = createContext<
  ComponentDefinitionContextType | undefined
>(undefined);

export { ComponentDefinitionContext };

export function ComponentDefinitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('navo_selected_projectId');
      if (stored) setSelectedProjectId(stored);
    }
  }, []);

  // 인증된 사용자만 API 호출, 프로젝트 선택된 경우만
  const { data, isLoading, isError, error } = useListComponents(
    selectedProjectId || '',
    {
      enabled: isAuthenticated && !!selectedProjectId,
      queryKey: ['componentDefinitions', selectedProjectId, isAuthenticated],
    } as any
  );

  const componentRegistry = new Map<string, ComponentDef>();

  useEffect(() => {
    if (isAuthenticated && data?.components) {
      data.components.forEach((comp) => {
        componentRegistry.set(comp.name, comp);
      });
      console.log(
        `Loaded ${data.components.length} component definitions into registry.`
      );
    }
  }, [data, isAuthenticated]);

  return (
    <ComponentDefinitionContext.Provider
      value={{
        componentRegistry,
        isLoading: isAuthenticated && !!selectedProjectId ? isLoading : false,
        isError: isAuthenticated && !!selectedProjectId ? isError : false,
        error: isAuthenticated && !!selectedProjectId ? error : null,
      }}
    >
      {children}
    </ComponentDefinitionContext.Provider>
  );
}

export function useComponentDefinitions() {
  const context = useContext(ComponentDefinitionContext);
  if (context === undefined) {
    throw new Error(
      'useComponentDefinitions must be used within a ComponentDefinitionProvider'
    );
  }
  return context;
}
