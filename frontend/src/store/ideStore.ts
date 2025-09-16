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
  status: 'sending' | 'success' | 'error';
  error?: string;
}

export type ChatMessage = UserMessage | AgentMessage;

type WorkflowState =
  | 'idle'
  | 'awaiting_confirmation'
  | 'running'
  | 'completed'
  | 'failed';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

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
  nodesById: Record<
    string,
    {
      name: string;
      path?: string;
      displayNames?: Record<string, string>;
    }
  >;
  upsertNodeMeta: (
    nodeId: string,
    meta: {
      name: string;
      path?: string;
      displayNames?: Record<string, string>;
    },
  ) => void;
  upsertManyNodeMeta: (
    entries: Array<{
      id: string;
      name: string;
      path?: string;
      displayNames?: Record<string, string>;
    }>,
  ) => void;

  // UI State
  activeView: 'editor' | 'preview';
  setActiveView: (view: 'editor' | 'preview') => void;
  activePreviewRoute: string | null;
  setActivePreviewRoute: (route: string | null) => void;

  // Preferences
  treeLabelMode: 'name' | 'filename';
  setTreeLabelMode: (mode: 'name' | 'filename') => void;

  // Chat Messages
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, partialMessage: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // Chat Processing State
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;

  // Workflow State
  workflowState: WorkflowState;
  workflowPlan: any | null; // This would be a typed Plan in a real app
  workflowOutputs: any | null;
  stepStatuses: Record<string, StepStatus>;
  setWorkflowState: (state: WorkflowState) => void;
  setWorkflowPlan: (plan: any | null) => void;
  setWorkflowOutputs: (outputs: any | null) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
  resetWorkflow: () => void;
}

export const useIdeStore = create<IdeState>((set) => ({
  // Project Context
  selectedProjectId: null,
  setSelectedProjectId: (projectId) => {
    set({
      selectedProjectId: projectId,
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
  nodesById: {},
  upsertNodeMeta: (nodeId, meta) =>
    set((state) => {
      const prev = state.nodesById[nodeId] || {};
      const mergedDisplayNames = {
        ...(prev.displayNames || {}),
        ...(meta.displayNames || {}),
      };
      return {
        nodesById: {
          ...state.nodesById,
          [nodeId]: {
            ...prev,
            name: meta.name ?? prev.name,
            path: meta.path ?? prev.path,
            displayNames: mergedDisplayNames,
          },
        },
      };
    }),
  upsertManyNodeMeta: (entries) =>
    set((state) => {
      const next = { ...state.nodesById };
      for (const e of entries) {
        const base = (e.name || '').replace(/\.(tsx|jsx|ts|js|html)$/i, '');
        const prev = next[e.id] || {};
        const prevDn = prev.displayNames || {};
        const dn = e.displayNames || {};
        next[e.id] = {
          ...prev,
          name: e.name,
          path: e.path,
          displayNames: {
            ko: prevDn.ko ?? dn.ko ?? base,
            en: prevDn.en ?? dn.en ?? base,
            ja: prevDn.ja ?? dn.ja ?? base,
            ...prevDn,
            ...dn,
          },
        };
      }
      return { nodesById: next } as Partial<IdeState> as any;
    }),
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

  // UI State
  activeView: 'editor',
  setActiveView: (view) => set({ activeView: view }),
  activePreviewRoute: null,
  setActivePreviewRoute: (route) => set({ activePreviewRoute: route }),

  // Chat Processing State
  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),

  // Chat Messages
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, partialMessage) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id) return m;

        // 타입 안전한 업데이트
        if (m.role === 'user') {
          return { ...m, ...partialMessage } as UserMessage;
        } else {
          return { ...m, ...partialMessage } as AgentMessage;
        }
      }),
    })),
  clearMessages: () => set({ messages: [] }),

  // Preferences
  treeLabelMode: 'name',
  setTreeLabelMode: (mode) => set({ treeLabelMode: mode }),

  // Workflow State
  workflowState: 'idle',
  workflowPlan: null,
  workflowOutputs: null,
  stepStatuses: {},
  setWorkflowState: (state) => set({ workflowState: state }),
  setWorkflowPlan: (plan) => {
    const initialStatuses =
      plan?.steps?.reduce((acc: any, step: any) => {
        acc[step.id] = 'pending';
        return acc;
      }, {}) || {};
    set({ workflowPlan: plan, stepStatuses: initialStatuses });
  },
  setWorkflowOutputs: (outputs) => set({ workflowOutputs: outputs }),
  setStepStatus: (stepId, status) =>
    set((state) => ({
      stepStatuses: {
        ...state.stepStatuses,
        [stepId]: status,
      },
    })),
  resetWorkflow: () =>
    set({
      workflowState: 'idle',
      workflowPlan: null,
      workflowOutputs: null,
      stepStatuses: {},
      isProcessing: false,
    }),
}));
