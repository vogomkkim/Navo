"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useListComponents } from "@/lib/api";
import { useAuth } from "./AuthContext";

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

  // 인증된 사용자만 API 호출
  const { data, isLoading, isError, error } = useListComponents({
    enabled: isAuthenticated, // 인증된 경우에만 쿼리 실행
    queryKey: ["componentDefinitions", isAuthenticated], // queryKey 추가
  });

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
        isLoading: isAuthenticated ? isLoading : false,
        isError: isAuthenticated ? isError : false,
        error: isAuthenticated ? error : null,
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
      "useComponentDefinitions must be used within a ComponentDefinitionProvider"
    );
  }
  return context;
}
