'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';

interface LayoutComponent {
  id: string;
  type: string;
  props: Record<string, any>;
}

interface Layout {
  components: LayoutComponent[];
}

interface LayoutContextType {
  currentLayout: Layout | null;
  setCurrentLayout: (layout: Layout | null) => void;
  updateComponentProp: (
    componentId: string,
    propName: string,
    newValue: any
  ) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [currentLayout, setCurrentLayout] = useState<Layout | null>(null);

  const updateComponentProp = useCallback(
    (componentId: string, propName: string, newValue: any) => {
      setCurrentLayout((prevLayout) => {
        if (!prevLayout) return null;

        const newComponents = prevLayout.components.map((comp) => {
          if (comp.id === componentId) {
            return {
              ...comp,
              props: {
                ...comp.props,
                [propName]: newValue,
              },
            };
          }
          return comp;
        });
        return { ...prevLayout, components: newComponents };
      });
    },
    []
  );

  return (
    <LayoutContext.Provider
      value={{
        currentLayout,
        setCurrentLayout,
        updateComponentProp,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}
