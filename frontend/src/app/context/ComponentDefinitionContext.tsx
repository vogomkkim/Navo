'use client';

import React, { createContext, useContext } from 'react';

// This context is now a placeholder.
// Component definitions will be managed through the VFS.
export const ComponentDefinitionContext = createContext<any>(null);

export const useComponentDefinition = () => {
  const context = useContext(ComponentDefinitionContext);
  if (!context) {
    throw new Error(
      'useComponentDefinition must be used within a ComponentDefinitionProvider',
    );
  }
  return context;
};

export const ComponentDefinitionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // The provider now simply renders its children without fetching any data.
  const value = {};

  return (
    <ComponentDefinitionContext.Provider value={value}>
      {children}
    </ComponentDefinitionContext.Provider>
  );
};