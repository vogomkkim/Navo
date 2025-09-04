'use client';

import { ChevronDownIcon } from '@radix-ui/react-icons';
import * as Select from '@radix-ui/react-select';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { ChatSection } from '@/components/ui/ChatSection';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { FileTabs } from '@/components/ui/FileTabs';
import { FileTree } from '@/components/ui/FileTree';
import {
  useListProjects,
  useUpdateVfsNodeContent,
  useVfsNodeContent,
} from '@/hooks/api';
import { useIdeStore } from '@/store/ideStore';
import { NoProjectsPlaceholder } from './ui/NoProjectsPlaceholder';
import { ProfileMenu } from './ui/ProfileMenu';
import { StatusDisplay } from './ui/StatusDisplay';

type ActiveView = 'editor' | 'preview';

export default function HomeContent() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Zustand store integration for project context
  const { selectedProjectId, setSelectedProjectId } = useIdeStore((state) => ({
    selectedProjectId: state.selectedProjectId,
    setSelectedProjectId: state.setSelectedProjectId,
  }));

  const { activeFile, setActiveFile } = useIdeStore();
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [showMessage, setShowMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: vfsNodeData, isLoading: isLoadingVfsNode } = useVfsNodeContent(
    selectedProjectId || '',
    activeFile // Use activeFile from store
  );

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({
    enabled: !isAuthLoading && !!token,
  });

  useEffect(() => {
    // Automatically select the first project on initial load if none is selected
    if (!selectedProjectId && projectsData?.projects?.length) {
      setSelectedProjectId(projectsData.projects[0].id);
    }
  }, [projectsData, selectedProjectId, setSelectedProjectId]);

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
    onSuccess: () => {
      showSuccessMessage('파일이 성공적으로 저장되었습니다!');
      if (previewIframeRef.current) {
        previewIframeRef.current.src = `/api/preview/${selectedProjectId}`;
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
      // This would ideally be a route to a new project page or a modal
      queryClient.clear();
      window.location.reload(); // Simple way to reset for now
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

  const hasProjects = projectsData && projectsData.projects && projectsData.projects.length > 0;

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
              <Select.Trigger className="inline-flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <Select.Value placeholder="프로젝트 선택" />
                <Select.Icon>
                  <ChevronDownIcon />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="overflow-hidden rounded-lg bg-white shadow-lg border border-gray-200">
                  <Select.Viewport className="p-1">
                    {isLoadingProjects ? (
                      <Select.Item value="loading" disabled>
                        불러오는 중...
                      </Select.Item>
                    ) : (
                      projectsData?.projects?.map((project) => (
                        <Select.Item key={project.id} value={project.id}>
                          <Select.ItemText>{project.name}</Select.ItemText>
                        </Select.Item>
                      ))
                    )}
                    <Select.Separator />
                    <Select.Item value="new">새 프로젝트 만들기</Select.Item>
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
          {!hasProjects ? (
            <NoProjectsPlaceholder />
          ) : !selectedProjectId ? (
            <div className="preview-placeholder">
              <h2>프로젝트를 선택하여 시작하세요</h2>
            </div>
          ) : (
            <div>
              <div className="view-switcher" style={{ marginBottom: '1rem' }}>
                <button onClick={() => setActiveView('editor')} disabled={activeView === 'editor'} className="btn btn-secondary mr-2">에디터</button>
                <button onClick={() => setActiveView('preview')} disabled={activeView === 'preview'} className="btn btn-secondary">미리보기</button>
              </div>

              {activeView === 'editor' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '250px 1fr',
                    height: '100%',
                    gap: '1rem',
                  }}
                >
                  <div className="file-tree-panel">
                    <h2 className="text-lg font-medium mb-2">
                      📁 {currentProjectName}
                    </h2>
                    <FileTree projectId={selectedProjectId} />
                  </div>
                  <div className="code-editor-panel">
                    <FileTabs />
                    <button
                      onClick={handleSave}
                      disabled={
                        !activeFile ||
                        updateMutation.isPending ||
                        editedContent === vfsNodeData?.node?.content
                      }
                      className="btn btn-primary my-2"
                    >
                      {updateMutation.isPending ? '저장 중...' : '저장'}
                    </button>
                    {!activeFile ? (
                      <div>파일을 선택하여 편집을 시작하세요.</div>
                    ) : isLoadingVfsNode ? (
                      <div>파일을 불러오는 중...</div>
                    ) : (
                      <CodeEditor
                        content={editedContent}
                        onChange={(value) => setEditedContent(value || '')}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="live-preview-panel">
                  <h2 className="text-lg font-medium mb-2">실시간 미리보기</h2>
                  <iframe
                    ref={previewIframeRef}
                    src={`/api/preview/${selectedProjectId}`}
                    title="Live Preview"
                    style={{
                      width: '100%',
                      height: '80vh',
                      border: '1px solid #ccc',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
