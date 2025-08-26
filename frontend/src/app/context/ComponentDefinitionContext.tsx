'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useListComponents } from '@/lib/api';

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

const ComponentDefinitionContext = createContext<ComponentDefinitionContextType | undefined>(undefined);

export function ComponentDefinitionProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, error } = useListComponents();
  const componentRegistry = new Map<string, ComponentDef>();

  useEffect(() => {
    if (data?.components) {
      data.components.forEach((comp) => {
        componentRegistry.set(comp.name, comp);
      });
      console.log(`Loaded ${data.components.length} component definitions into registry.`);
    }
  }, [data]);

  return (
    <ComponentDefinitionContext.Provider value={{ componentRegistry, isLoading, isError, error }}>
      {children}
    </ComponentDefinitionContext.Provider>
  );
}

export function useComponentDefinitions() {
  const context = useContext(ComponentDefinitionContext);
  if (context === undefined) {
    throw new Error('useComponentDefinitions must be used within a ComponentDefinitionProvider');
  }
  return context;
}