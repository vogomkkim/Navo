/* eslint-disable react/prop-types */
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { UseMutationResult } from '@tanstack/react-query';
import { useIdeStore } from '@/store/ideStore';
import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import {
  useVfsNodeContent,
  useUpdateVfsNodeContent,
  useListVfsNodes,
} from '@/hooks/api/useVfs';
import { useListProjects } from '@/hooks/api/useProject';
import * as Select from '@radix-ui/react-select';
import {
  ChevronDownIcon,
  CubeIcon,
  EyeOpenIcon,
  Pencil2Icon,
  CheckIcon,
} from '@radix-ui/react-icons';
import { ProfileMenu } from '@/components/ui/ProfileMenu';
import { StatusDisplay } from '@/components/ui/StatusDisplay';
import { ChatSection } from '@/components/ui/ChatSection';
import { NoProjectsPlaceholder } from '@/components/ui/NoProjectsPlaceholder';
import { FileTree } from '@/components/ui/FileTree';
import { FileTabs } from '@/components/ui/FileTabs';
import { CodeEditor } from '@/components/ui/CodeEditor';

type ActiveView = 'editor' | 'preview';

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

interface PreviewPanelProps {
  previewIframeRef: React.RefObject<HTMLIFrameElement | null>;
  selectedProjectId: string;
  activeFile: string | null;
  vfsNodeData: VfsNodeResponse | undefined;
  onSwitchToEditor: () => void;
}

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
  <div className="grid grid-cols-[250px_1fr] h-full min-h-0 gap-4">
    <div className="file-tree-panel bg-gray-50/50 rounded-lg border border-gray-200/80 h-full min-h-0 flex flex-col">
      <h2 className="sticky top-0 z-10 text-md font-medium text-gray-700 px-3 py-3 bg-gray-50/80 backdrop-blur rounded-t-lg border-b border-gray-200/80">
        {currentProjectName}
      </h2>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <FileTree projectId={selectedProjectId} />
      </div>
    </div>
    <div className="code-editor-panel flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white">
        <div className="flex-1 min-w-0">
          <FileTabs />
        </div>
        {activeFile && editedContent !== vfsNodeData?.node?.content && (
          <button
            onClick={handleSave}
            disabled={!activeFile || updateMutation.isPending}
            className="flex items-center gap-2 btn btn-ghost btn-sm text-gray-600 hover:bg-gray-200"
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
      <div className="flex-grow relative min-h-0">
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

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  previewIframeRef,
  selectedProjectId,
  activeFile,
  vfsNodeData,
  onSwitchToEditor,
}) => {
  const { token } = useAuth();
  const { data: rootVfsNodes } = useListVfsNodes(selectedProjectId, null);
  const [allVfsNodes, setAllVfsNodes] = useState<VfsNode[]>([]);

  // This effect can be simplified later, but for now, let's fetch all nodes
  useEffect(() => {
    const fetchAllNodes = async () => {
      if (!rootVfsNodes?.nodes || !selectedProjectId || !token) return;
      // This is a simplified fetch, a real implementation would be more robust
      setAllVfsNodes(rootVfsNodes.nodes);
    };
    fetchAllNodes();
  }, [rootVfsNodes, selectedProjectId, token]);

  const pageList = allVfsNodes
    .filter(
      (node) => node.nodeType === 'FILE' && /\.(tsx|jsx)$/i.test(node.name)
    )
    .map((node) => {
      const name = node.name.replace(/\.(tsx|jsx)$/i, '');
      return {
        id: node.id,
        name: name,
        path: node.metadata?.path || `/${name}`,
        isActive: activeFile === node.id,
      };
    });

  const activePageId = pageList.find((p) => p.isActive)?.id || '';

  return (
    <div className="live-preview-panel h-full flex flex-col">
      <div className="flex-1">
        <iframe
          ref={previewIframeRef}
          src={`/api/preview/${selectedProjectId}`}
          title="Live Preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};

export default function HomeContent() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const selectedProjectId = useIdeStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useIdeStore(
    (state) => state.setSelectedProjectId
  );
  const activeFile = useIdeStore((state) => state.activeFile);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('preview');
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const { data: vfsNodeData, isLoading: isLoadingVfsNode } = useVfsNodeContent(
    selectedProjectId || '',
    activeFile
  );

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({
    enabled: !isAuthLoading && !!token,
  });

  // Build page list for sticky toolbar preview select
  const { data: rootVfsNodes } = useListVfsNodes(selectedProjectId, null);
  const allVfsNodes = (rootVfsNodes?.nodes ?? []) as VfsNode[];
  const pageList = allVfsNodes
    .filter(
      (node) => node.nodeType === 'FILE' && /\.(tsx|jsx)$/i.test(node.name)
    )
    .map((node) => {
      const name = node.name.replace(/\.(tsx|jsx)$/i, '');
      return {
        id: node.id,
        name,
        path: node.metadata?.path || `/${name}`,
      };
    });
  const activePageId = activeFile ?? '';

  useEffect(() => {
    if (vfsNodeData?.node?.nodeType === 'FILE') {
      setEditedContent(vfsNodeData.node.content ?? '');
    }
    // 디렉토리 선택 시에는 편집 내용을 유지 (변경 없음)
  }, [vfsNodeData]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  const updateMutation = useUpdateVfsNodeContent({
    onSuccess: (data) => {
      if (previewIframeRef.current) {
        previewIframeRef.current.src = `/api/preview/${data.node.projectId}`;
      }
    },
    onError: (error) => {
      console.error(`File save error: ${error.message}`);
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
      setSelectedProjectId(null);
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
            <div className="flex flex-col h-full gap-2">
              {/* Global sticky toolbar: toggle + preview page select in one line */}
              <div className="sticky top-0 z-20 flex items-center justify-start gap-3 px-4 py-2 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-gray-200">
                <div className="inline-flex items-center rounded-md border border-gray-300 overflow-hidden bg-white shadow-sm">
                  <button
                    title="에디터"
                    aria-pressed={activeView === 'editor'}
                    onClick={() => setActiveView('editor')}
                    className={
                      activeView === 'editor'
                        ? 'px-2.5 py-1.5 text-xs bg-blue-600 text-white'
                        : 'px-2.5 py-1.5 text-xs bg-white text-gray-700 hover:bg-gray-100'
                    }
                  >
                    <Pencil2Icon className="w-4 h-4" />
                  </button>
                  <button
                    title="미리보기"
                    aria-pressed={activeView === 'preview'}
                    onClick={() => setActiveView('preview')}
                    className={
                      activeView === 'preview'
                        ? 'px-2.5 py-1.5 text-xs bg-blue-600 text-white border-l border-blue-600'
                        : 'px-2.5 py-1.5 text-xs bg-white text-gray-700 hover:bg-gray-100 border-l border-gray-300'
                    }
                  >
                    <EyeOpenIcon className="w-4 h-4" />
                  </button>
                </div>
                {activeView === 'preview' && (
                  <div className="flex items-center gap-2 ml-2">
                    <Select.Root
                      value={activePageId}
                      onValueChange={(nodeId) => {
                        if (nodeId && previewIframeRef.current) {
                          const newSrc = `/api/preview/${selectedProjectId}?nodeId=${nodeId}`;
                          previewIframeRef.current.src = newSrc;
                        }
                      }}
                    >
                      <Select.Trigger className="flex items-center justify-between w-44 px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none">
                        <Select.Value placeholder="페이지 선택" />
                        <Select.Icon className="text-gray-400">
                          <ChevronDownIcon className="w-3.5 h-3.5" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden bg-white border border-gray-300 rounded-md shadow-lg">
                          <Select.Viewport className="p-1">
                            {pageList.map((page) => (
                              <Select.Item
                                key={page.id}
                                value={page.id}
                                className="relative flex items-center px-3 py-1.5 text-sm text-gray-700 rounded-sm cursor-pointer select-none hover:bg-gray-100 focus:bg-gray-100 focus:outline-none data-[highlighted]:bg-gray-100 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-700"
                              >
                                <Select.ItemText>{page.name}</Select.ItemText>
                                <Select.ItemIndicator className="absolute right-2 flex items-center justify-center">
                                  <CheckIcon className="w-4 h-4" />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                )}
              </div>
              <div className="flex-grow relative">
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
                    activeFile={activeFile}
                    vfsNodeData={vfsNodeData}
                    onSwitchToEditor={() => setActiveView('editor')}
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
