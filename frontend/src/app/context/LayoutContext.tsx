'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useDraft, useSaveDraft } from '@/lib/api'; // Assuming these are correct

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
  isLoadingLayout: boolean;
  isErrorLayout: boolean;
  layoutError: Error | null;
  updateComponentProp: (componentId: string, propName: string, newValue: any) => void;
  saveLayout: () => void;
  isSavingLayout: boolean;
  saveLayoutError: Error | null;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { data: draftData, isLoading: isLoadingDraft, isError: isErrorDraft, error: draftError } = useDraft();
  const [currentLayout, setCurrentLayout] = useState<Layout | null>(null);

  // Initialize currentLayout when draftData is loaded
  useEffect(() => {
    if (draftData?.draft?.layout && JSON.stringify(draftData.draft.layout) !== JSON.stringify(currentLayout)) {
      setCurrentLayout(draftData.draft.layout);
    }
  }, [draftData, currentLayout]);

  const { mutate: performSaveLayout, isPending: isSavingLayout, isError: isSaveError, error: saveError } = useSaveDraft();

  const updateComponentProp = useCallback((componentId: string, propName: string, newValue: any) => {
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
  }, []);

  const saveLayout = useCallback(() => {
    if (currentLayout) {
      performSaveLayout(currentLayout, {
        onSuccess: (data) => {
          console.log('Layout saved successfully via LayoutContext:', data);
          // Optionally refetch draft to ensure consistency
        },
        onError: (err) => {
          console.error('Failed to save layout via LayoutContext:', err);
        },
      });
    }
  }, [currentLayout, performSaveLayout]);

  return (
    <LayoutContext.Provider
      value={{
        currentLayout,
        isLoadingLayout: isLoadingDraft,
        isErrorLayout: isErrorDraft,
        layoutError: draftError,
        updateComponentProp,
        saveLayout,
        isSavingLayout,
        saveLayoutError: isSaveError ? saveError : null,
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