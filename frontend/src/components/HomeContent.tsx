import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useIdeStore } from '@/store/ideStore';
import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { useVfsNodeContent, useUpdateVfsNodeContent, useListVfsNodes } from '@/hooks/api/useVfs';
import { useListProjects } from '@/hooks/api/useProject';
import * as Select from '@radix-ui/react-select';
import {
  ChevronDownIcon,
  ChevronUpIcon,
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
  activeFile: string | null;
  vfsNodeData: VfsNodeResponse | undefined;
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
  activeFile,
  vfsNodeData,
}) => {
  const getCurrentPageInfo = () => {
    if (vfsNodeData?.node) {
      const node = vfsNodeData.node;
      let fileName = '';
      let fileType = '';
      let breadcrumb: string[] = [];

      // 경로가 있으면 경로에서 파일명 추출
      if (node.metadata?.path) {
        const pathParts = node.metadata.path.split('/').filter(part => part);
        fileName = pathParts[pathParts.length - 1];
        breadcrumb = pathParts.slice(0, -1); // 파일명 제외한 경로
      } else if (node.name) {
        fileName = node.name;
        breadcrumb = [];
      }

      // 파일 확장자 추출
      const match = fileName.match(/\.(tsx|jsx|ts|js|html)$/i);
      if (match) {
        fileType = match[1].toUpperCase();
        fileName = fileName.replace(/\.(tsx|jsx|ts|js|html)$/i, '');
      }

      return { fileName, fileType, breadcrumb };
    }
    return { fileName: '미리보기', fileType: '', breadcrumb: [] };
  };

  const { fileName, fileType, breadcrumb } = getCurrentPageInfo();

  // VFS에서 모든 노드 가져오기 (페이지 목록 생성용)
  const { data: rootVfsNodes, isLoading: isLoadingVfsNodes, error: vfsError } = useListVfsNodes(selectedProjectId, null);

  // AuthContext에서 토큰 가져오기
  const { token } = useAuth();

  // 모든 VFS 노드를 재귀적으로 가져오는 함수
  const getAllVfsNodes = async () => {
    if (!rootVfsNodes?.nodes || !selectedProjectId || !token) return [];

    const allNodes = [...rootVfsNodes.nodes];

    // 재귀적으로 모든 하위 노드 가져오기
    const fetchChildren = async (parentId: string) => {
      try {
        const response = await fetch(`/api/projects/${selectedProjectId}/vfs?parentId=${parentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const children = data.nodes || [];
          allNodes.push(...children);

          // 각 디렉토리에 대해 재귀적으로 하위 노드 가져오기
          for (const child of children) {
            if (child.nodeType === 'DIRECTORY') {
              await fetchChildren(child.id);
            }
          }
        }
      } catch (error) {
        console.error('VFS 하위 노드 가져오기 실패:', error);
      }
    };

    // 루트 디렉토리의 모든 하위 노드 가져오기
    for (const rootNode of rootVfsNodes.nodes) {
      if (rootNode.nodeType === 'DIRECTORY') {
        await fetchChildren(rootNode.id);
      }
    }

    return allNodes;
  };

  // 모든 VFS 노드 상태
  const [allVfsNodes, setAllVfsNodes] = useState<any[]>([]);
  const [isLoadingAllNodes, setIsLoadingAllNodes] = useState(false);

  // VFS 노드 로드
  useEffect(() => {
    if (rootVfsNodes?.nodes && selectedProjectId && token) {
      setIsLoadingAllNodes(true);
      getAllVfsNodes().then(nodes => {
        setAllVfsNodes(nodes);
        setIsLoadingAllNodes(false);
        console.log('=== 모든 VFS 노드 로드 완료 ===');
        console.log('총 노드 수:', nodes.length);
        console.log('파일 노드들:', nodes.filter(n => n.nodeType === 'FILE').map(n => ({ name: n.name, path: n.metadata?.path })));
      });
    }
  }, [rootVfsNodes, selectedProjectId, token]);

  // VFS 로딩 상태 디버깅
  console.log('=== VFS API 상태 ===');
  console.log('isLoadingVfsNodes:', isLoadingVfsNodes);
  console.log('vfsError:', vfsError);
  console.log('selectedProjectId:', selectedProjectId);

  // 페이지 목록 생성 (VFS에서 페이지 컴포넌트들 수집)
  const getPageList = () => {
    console.log('=== VFS 데이터 디버깅 ===');
    console.log('allVfsNodes:', allVfsNodes);
    console.log('selectedProjectId:', selectedProjectId);

    if (!allVfsNodes || allVfsNodes.length === 0) {
      console.log('VFS 노드가 없습니다. Mock 데이터 사용');
      // Mock 데이터 반환
      return [
        { id: 'home', name: 'Home', path: '/home', isActive: fileName.toLowerCase() === 'home', nodeId: null, fullPath: 'Home.tsx' },
        { id: 'about', name: 'About', path: '/about', isActive: fileName.toLowerCase() === 'about', nodeId: null, fullPath: 'About.tsx' },
        { id: 'contact', name: 'Contact', path: '/contact', isActive: fileName.toLowerCase() === 'contact', nodeId: null, fullPath: 'Contact.tsx' },
        { id: 'services', name: 'Services', path: '/services', isActive: fileName.toLowerCase() === 'services', nodeId: null, fullPath: 'Services.tsx' }
      ];
    }

    // pages 폴더 찾기
    const pagesFolder = allVfsNodes.find(node =>
      node.nodeType === 'DIRECTORY' && node.name === 'pages'
    );

    // VFS 노드에서 페이지 컴포넌트들 필터링
    const pageNodes = allVfsNodes.filter(node => {
      // 파일이어야 함
      if (node.nodeType !== 'FILE') return false;

      // pages 폴더의 파일들만 포함 (확장자 유무 관계없이)
      const isInPagesFolder = pagesFolder && node.parentId === pagesFolder.id;

      // 또는 확장자가 있는 파일들
      const hasValidExtension = /\.(tsx|jsx|ts|js|html)$/i.test(node.name);

      return isInPagesFolder || hasValidExtension;
    });

    // 페이지 목록 생성 (서브 패스 지원)
    const pages = pageNodes.map(node => {
      const name = node.name.replace(/\.(tsx|jsx|ts|js|html)$/i, '');

      // 경로 기반으로 ID와 경로 생성
      let id, path;
      if (node.metadata?.path) {
        const pathParts = node.metadata.path.split('/').filter(part => part);
        const fileName = pathParts[pathParts.length - 1].replace(/\.(tsx|jsx|ts|js|html)$/i, '');
        id = pathParts.join('-').toLowerCase();
        path = `/${pathParts.join('/')}`;
      } else {
        id = name.toLowerCase();
        path = `/${id}`;
      }

      const isActive = fileName.toLowerCase() === name.toLowerCase();

      return {
        id,
        name,
        path,
        isActive,
        nodeId: node.id,
        fullPath: node.metadata?.path || node.name
      };
    });

    // 경로별로 정렬 (루트 페이지 먼저, 그 다음 서브 패스)
    pages.sort((a, b) => {
      const aDepth = a.path.split('/').length;
      const bDepth = b.path.split('/').length;
      if (aDepth !== bDepth) return aDepth - bDepth;
      return a.name.localeCompare(b.name);
    });

    // 페이지가 없으면 빈 배열 반환
    if (pages.length === 0) {
      console.log('VFS에서 페이지를 찾을 수 없습니다.');
      console.log('pagesFolder:', pagesFolder);
      console.log('pageNodes:', pageNodes);
      return [];
    }

    console.log('=== 페이지 목록 생성 완료 ===');
    console.log('pagesFolder:', pagesFolder);
    console.log('pageNodes:', pageNodes.map(n => ({ name: n.name, parentId: n.parentId, id: n.id })));
    console.log('pages:', pages.map(p => ({ name: p.name, nodeId: p.nodeId })));

    return pages;
  };

  const pageList = getPageList();

  return (
    <div className="live-preview-panel h-full flex flex-col">
      {/* 페이지 셀렉트 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">페이지:</span>
        <Select.Root
          value={pageList.find(p => p.isActive)?.id || ''}
            onValueChange={(value) => {
              const selectedPage = pageList.find(p => p.id === value);
              if (selectedPage) {
                console.log(`페이지 전환: ${selectedPage.name} (nodeId: ${selectedPage.nodeId})`);

                if (selectedPage.nodeId) {
                  // VFS에서 해당 페이지 파일 내용 가져오기
                  console.log(`VFS API 호출: /api/projects/${selectedProjectId}/vfs/${selectedPage.nodeId}`);

                  // 실제 VFS API 호출하여 파일 내용 가져오기
                  // 1. 미리보기 iframe의 src를 업데이트하여 새로운 페이지 로드
                  if (previewIframeRef.current) {
                    const newSrc = `/api/preview/${selectedProjectId}?nodeId=${selectedPage.nodeId}`;
                    previewIframeRef.current.src = newSrc;
                    console.log(`미리보기 업데이트: ${newSrc}`);
                  }
                } else {
                  console.log('Mock 페이지 - 실제 VFS API 호출 필요');
                }
              }
            }}
        >
          <Select.Trigger className="flex items-center justify-between w-48 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <Select.Value placeholder="페이지를 선택하세요" />
            <Select.Icon className="text-gray-400">
              <ChevronDownIcon className="w-4 h-4" />
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content className="overflow-hidden bg-white border border-gray-300 rounded-md shadow-lg">
              <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                <ChevronUpIcon className="w-4 h-4" />
              </Select.ScrollUpButton>

              <Select.Viewport className="p-1">
                {pageList.map((page) => (
                  <Select.Item
                    key={page.id}
                    value={page.id}
                    className="relative flex items-center px-3 py-2 text-sm text-gray-700 rounded-sm cursor-pointer select-none hover:bg-gray-100 focus:bg-gray-100 focus:outline-none data-[highlighted]:bg-gray-100 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-700"
                  >
                    <Select.ItemText>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{page.name}</span>
                          {page.nodeId && (
                            <span className="text-xs text-gray-500">({page.path})</span>
                          )}
                        </div>
                        {page.fullPath && page.fullPath !== page.name && (
                          <span className="text-xs text-gray-400 truncate">
                            {page.fullPath}
                          </span>
                        )}
                      </div>
                    </Select.ItemText>
                    <Select.ItemIndicator className="absolute right-2 flex items-center justify-center">
                      <CheckIcon className="w-4 h-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>

              <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                <ChevronDownIcon className="w-4 h-4" />
              </Select.ScrollDownButton>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {/* 페이지 이름 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>

          {/* 브레드크럼 */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            {breadcrumb.length > 0 && (
              <>
                {breadcrumb.map((part, index) => (
                  <span key={index} className="flex items-center gap-1">
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-500">{part}</span>
                  </span>
                ))}
                <span className="text-gray-400">/</span>
              </>
            )}
            <span className="font-medium text-gray-700">
              {fileName}
            </span>
            {fileType && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded ml-1">
                {fileType}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Live Preview
        </div>
      </div>

      {/* 미리보기 iframe */}
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
                    activeFile={activeFile}
                    vfsNodeData={vfsNodeData}
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
