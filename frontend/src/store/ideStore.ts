import { create } from 'zustand';

// ... (message type definitions remain the same)
export type AgentRole =
  | 'Strategic Planner'
  | 'Project Manager'
  | 'Full-Stack Developer'
  | 'Quality Assurance Engineer'
  | 'DevOps Engineer';

export type AgentStatus =
  | 'waiting'
  | 'analyzing'
  | 'planning'
  | 'developing'
  | 'testing'
  | 'deploying'
  | 'completed'
  | 'error';

export interface AgentMessage {
  id: string;
  role: AgentRole;
  message: string;
  status: AgentStatus;
  timestamp: Date;
  details?: any;
}

export interface UserMessage {
  id: string;
  role: 'user';
  message: string;
  timestamp: Date;
}

export type ChatMessage = UserMessage | AgentMessage;


interface IdeState {
  // Project Context
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;

  // File System State
  fileTree: any;
  openFiles: string[];
  activeFile: string | null;
  setFileTree: (fileTree: any) => void;
  addOpenFile: (filePath: string) => void;
  closeOpenFile: (filePath: string) => void;
  setActiveFile: (filePath: string | null) => void;

  // Chat Processing State
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

export const useIdeStore = create<IdeState>((set) => ({
  // Project Context
  selectedProjectId: null,
  setSelectedProjectId: (projectId) => {
    set({ 
      selectedProjectId: projectId, 
      // Reset related states on project change
      activeFile: null, 
      openFiles: [],
      fileTree: null,
    });
  },

  // File System State
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

  // Chat Processing State
  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),
}));
