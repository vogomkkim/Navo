import { create } from 'zustand';

interface IdeState {
  fileTree: any; // TODO: Define a proper type for the file tree
  openFiles: string[];
  activeFile: string | null;
  setFileTree: (fileTree: any) => void;
  addOpenFile: (filePath: string) => void;
  closeOpenFile: (filePath: string) => void;
  setActiveFile: (filePath: string | null) => void;
}

export const useIdeStore = create<IdeState>((set) => ({
  fileTree: null,
  openFiles: [],
  activeFile: null,
  setFileTree: (fileTree) => set({ fileTree }),
  addOpenFile: (filePath) =>
    set((state) => {
      if (state.openFiles.includes(filePath)) {
        return { ...state, activeFile: filePath };
      }
      return {
        ...state,
        openFiles: [...state.openFiles, filePath],
        activeFile: filePath,
      };
    }),
  closeOpenFile: (filePath) =>
    set((state) => {
      const newOpenFiles = state.openFiles.filter((f) => f !== filePath);
      let newActiveFile = state.activeFile;
      if (state.activeFile === filePath) {
        newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[0] : null;
      }
      return { ...state, openFiles: newOpenFiles, activeFile: newActiveFile };
    }),
  setActiveFile: (filePath) => set({ activeFile: filePath }),
}));
