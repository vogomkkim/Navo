import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useIdeStore } from '@/store/ideStore';
import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { useVfsNodeContent, useUpdateVfsNodeContent } from '@/hooks/api/useVfs';
import { useListProjects } from '@/hooks/api/useProject';
import * as Select from '@radix-ui/react-select';
import {
  ChevronDownIcon,
  CubeIcon,
  EyeOpenIcon,
  Pencil2Icon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@radix-ui/react-icons';
import { ProfileMenu } from '@/components/ui/ProfileMenu';
import { StatusDisplay } from '@/components/ui/StatusDisplay';
import { ChatSection } from '@/components/ui/ChatSection';
import { NoProjectsPlaceholder } from '@/components/ui/NoProjectsPlaceholder';
import { FileTree } from '@/components/ui/FileTree';
import { FileTabs } from '@/components/ui/FileTabs';
import { CodeEditor } from '@/components/ui/CodeEditor';
import clsx from 'clsx';

type ActiveView = 'editor' | 'preview';

// VFS-related types from useVfs.ts to ensure type safety
interface VfsNode {
  id: string;
  name: string;
  nodeType: 'FILE' | 'DIRECTORY';
  updatedAt: string;
  metadata: {
    path?: string;
  };
  content?: string;
  projectId: string;
}

interface VfsNodeResponse {
  node: VfsNode | null;
}

interface UpdateVfsNodePayload {
  projectId: string;
  nodeId: string;
  content: string;
}

// Props interface for EditorPanel
interface EditorPanelProps {
  currentProjectName: string;
  selectedProjectId: string;
  handleSave: () => void;
  updateMutation: UseMutationResult<
    VfsNodeResponse,
    Error,
    UpdateVfsNodePayload,
    unknown
  >;
  activeFile: string | null;
  isLoadingVfsNode: boolean;
  editedContent: string | null;
  setEditedContent: Dispatch<SetStateAction<string | null>>;
  vfsNodeData: VfsNodeResponse | undefined;
}

// Props interface for PreviewPanel
interface PreviewPanelProps {
  previewIframeRef: React.RefObject<HTMLIFrameElement | null>;
  selectedProjectId: string;
}

// EditorPanel Component
const EditorPanel: React.FC<EditorPanelProps> = ({
  currentProjectName,
  selectedProjectId,
  handleSave,
  updateMutation,
  activeFile,
  isLoadingVfsNode,
  editedContent,
  setEditedContent,
  vfsNodeData,
}) => (
  <div className="grid grid-cols-[250px_1fr] h-full gap-4">
    <div className="file-tree-panel bg-gray-50/50 rounded-lg border border-gray-200/80">
      <h2 className="text-md font-medium mb-2 text-gray-700 px-3 pt-3">
        {currentProjectName}
      </h2>
      <FileTree projectId={selectedProjectId} />
    </div>
    <div className="code-editor-panel flex flex-col h-full">
      <div className="flex items-center">
        <FileTabs />
        {activeFile && editedContent !== vfsNodeData?.node?.content && (
          <button
            onClick={handleSave}
            disabled={!activeFile || updateMutation.isPending}
            className="ml-auto flex items-center gap-2 btn btn-ghost btn-sm text-gray-600 hover:bg-gray-200"
          >
            {updateMutation.isPending ? (
              '저장 중...'
            ) : (
              <>
                <CheckIcon />
                저장
              </>
            )}
          </button>
        )}
      </div>
      <div className="flex-grow mt-2 relative">
        {!activeFile ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <Pencil2Icon className="w-12 h-12 mb-4" />
            <span className="text-lg">파일을 선택하여 편집을 시작하세요.</span>
          </div>
        ) : isLoadingVfsNode ? (
          <div className="absolute inset-0 flex items-center justify-center">
            파일을 불러오는 중...
          </div>
        ) : (
          <CodeEditor
            content={editedContent ?? ''}
            onChange={(value) => setEditedContent(value || '')}
          />
        )}
      </div>
    </div>
  </div>
);

// PreviewPanel Component
const PreviewPanel: React.FC<PreviewPanelProps> = ({
  previewIframeRef,
  selectedProjectId,
}) => (
  <div className="live-preview-panel h-full">
    <iframe
      ref={previewIframeRef}
      src={`/api/preview/${selectedProjectId}`}
      title="Live Preview"
      className="w-full h-full border border-gray-300 rounded-lg"
    />
  </div>
);

const ViewSwitcher = ({
  activeView,
  setActiveView,
}: {
  activeView: ActiveView;
  setActiveView: Dispatch<SetStateAction<ActiveView>>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="absolute top-2 right-2 z-10 flex items-center p-1 bg-gray-200/80 rounded-lg transition-all duration-300"
      onMouseLeave={() => setIsExpanded(false)}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-1 text-gray-600 hover:text-gray-900"
      >
        {isExpanded ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>
      <div
        className={clsx(
          'flex items-center transition-all duration-300 overflow-hidden',
          isExpanded ? 'max-w-xs' : 'max-w-0'
        )}
      >
        <button
          onClick={() => setActiveView('editor')}
          className={clsx(
            'px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 whitespace-nowrap',
            activeView === 'editor'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Pencil2Icon className="w-4 h-4" />
          에디터
        </button>
        <button
          onClick={() => setActiveView('preview')}
          className={clsx(
            'px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 whitespace-nowrap',
            activeView === 'preview'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <EyeOpenIcon className="w-4 h-4" />
          미리보기
        </button>
      </div>
    </div>
  );
};

export default function HomeContent() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Zustand store integration for project context
  const selectedProjectId = useIdeStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useIdeStore(
    (state) => state.setSelectedProjectId
  );

  const activeFile = useIdeStore((state) => state.activeFile);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('preview');
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [showMessage, setShowMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { data: vfsNodeData, isLoading: isLoadingVfsNode } = useVfsNodeContent(
    selectedProjectId || '',
    activeFile // Use activeFile from store
  );

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({
    enabled: !isAuthLoading && !!token,
  });

  useEffect(() => {
    setEditedContent(vfsNodeData?.node?.content ?? null);
  }, [vfsNodeData]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  const showSuccessMessage = (text: string) => {
    setShowMessage({ type: 'success', text });
    setTimeout(() => setShowMessage(null), 3000);
  };

  const showErrorMessage = (text: string) => {
    setShowMessage({ type: 'error', text });
    setTimeout(() => setShowMessage(null), 5000);
  };

  const updateMutation = useUpdateVfsNodeContent({
    onSuccess: (data) => {
      showSuccessMessage('파일이 성공적으로 저장되었습니다!');
      if (previewIframeRef.current) {
        // Use projectId from the mutation response data to avoid stale closures
        previewIframeRef.current.src = `/api/preview/${data.node.projectId}`;
      }
    },
    onError: (error) => {
      showErrorMessage(`파일 저장 오류: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (selectedProjectId && activeFile && editedContent !== null) {
      updateMutation.mutate({
        projectId: selectedProjectId,
        nodeId: activeFile,
        content: editedContent,
      });
    }
  };

  const handleProjectSelect = (projectId: string) => {
    if (projectId === 'new') {
      setSelectedProjectId(null); // Reset the selected project
      // This will cause the UI to re-render with NoProjectsPlaceholder
      // and an empty chat, ready for a new project idea.
      return;
    }
    setSelectedProjectId(projectId);
  };

  const currentProjectName =
    projectsData?.projects?.find((p) => p.id === selectedProjectId)?.name || '';

  if (isAuthLoading) {
    return <div>인증 정보를 불러오는 중...</div>;
  }

  if (!user) {
    return <div>로그인 페이지로 이동 중...</div>;
  }

  const hasProjects =
    projectsData && projectsData.projects && projectsData.projects.length > 0;

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="text-2xl font-bold text-gray-900">Navo 에디터</h1>
          {hasProjects && (
            <Select.Root
              value={selectedProjectId || ''}
              onValueChange={handleProjectSelect}
            >
              <Select.Trigger
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Project"
              >
                <CubeIcon className="h-4 w-4 text-gray-500 transition-colors group-hover:text-blue-500" />
                <Select.Value placeholder="프로젝트 선택..." />
                <Select.Icon className="text-gray-500">
                  <ChevronDownIcon className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={5}
                  className="z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg animate-in fade-in-75"
                >
                  <Select.Viewport className="p-1.5">
                    <Select.Group>
                      <Select.Label className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                        프로젝트 목록
                      </Select.Label>
                      {isLoadingProjects ? (
                        <Select.Item
                          value="loading"
                          disabled
                          className="relative flex cursor-default select-none items-center rounded-md py-2 pl-8 pr-4 text-sm text-gray-400 outline-none"
                        >
                          불러오는 중...
                        </Select.Item>
                      ) : (
                        projectsData?.projects?.map((project) => (
                          <Select.Item
                            key={project.id}
                            value={project.id}
                            className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm text-gray-800 outline-none transition-colors hover:bg-blue-50 focus:bg-blue-50"
                          >
                            <Select.ItemIndicator className="absolute left-2.5 inline-flex items-center justify-center">
                              <CheckIcon className="h-4 w-4 text-blue-500" />
                            </Select.ItemIndicator>
                            <Select.ItemText>{project.name}</Select.ItemText>
                          </Select.Item>
                        ))
                      )}
                    </Select.Group>
                    <Select.Separator className="my-1.5 h-px bg-gray-100" />
                    <Select.Item
                      value="new"
                      className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm text-blue-500 outline-none transition-colors hover:bg-blue-50 focus:bg-blue-50"
                    >
                      <Select.ItemText>+ 새 프로젝트 만들기</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          )}
        </div>
        <div className="topbar-actions">
          <ProfileMenu />
          <StatusDisplay />
        </div>
      </header>
      <main className="layout">
        <section className="ai-chat-interface">
          <ChatSection />
        </section>
        <section className="project-preview">
          {!hasProjects || !selectedProjectId ? (
            <NoProjectsPlaceholder />
          ) : (
            <div className="flex flex-col h-full gap-4">
              <div className="flex-grow relative">
                <ViewSwitcher
                  activeView={activeView}
                  setActiveView={setActiveView}
                />
                {activeView === 'editor' ? (
                  <EditorPanel
                    currentProjectName={currentProjectName}
                    selectedProjectId={selectedProjectId}
                    handleSave={handleSave}
                    updateMutation={updateMutation}
                    activeFile={activeFile}
                    isLoadingVfsNode={isLoadingVfsNode}
                    editedContent={editedContent}
                    setEditedContent={setEditedContent}
                    vfsNodeData={vfsNodeData}
                  />
                ) : (
                  <PreviewPanel
                    previewIframeRef={previewIframeRef}
                    selectedProjectId={selectedProjectId}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
