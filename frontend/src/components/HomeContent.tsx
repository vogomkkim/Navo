'use client';

import {
  ChevronDownIcon,
} from '@radix-ui/react-icons';
import * as Select from '@radix-ui/react-select';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { ChatSection } from '@/components/ui/ChatSection';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { FileTree } from '@/components/ui/FileTree';
import {
  useListProjects,
  useUpdateVfsNodeContent,
  useVfsNodeContent,
} from '@/lib/api';
import { ProfileMenu } from './ui/ProfileMenu';
import { StatusDisplay } from './ui/StatusDisplay';

export default function HomeContent() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const { data: vfsNodeData, isLoading: isLoadingVfsNode } = useVfsNodeContent(
    selectedProjectId || '',
    selectedFileId
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
    onSuccess: () => {
      showSuccessMessage('File saved successfully!');
      if (previewIframeRef.current) {
        previewIframeRef.current.src = `/api/preview/${selectedProjectId}`;
      }
    },
    onError: (error) => {
      showErrorMessage(`Error saving file: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (selectedProjectId && selectedFileId && editedContent !== null) {
      updateMutation.mutate({
        projectId: selectedProjectId,
        nodeId: selectedFileId,
        content: editedContent,
      });
    }
  };

  const handleProjectSelect = (projectId: string) => {
    if (projectId === 'new') {
      setSelectedProjectId(null);
      setSelectedFileId(null);
      queryClient.clear();
      window.location.reload();
      return;
    }
    setSelectedProjectId(projectId);
    setSelectedFileId(null);
  };

  const currentProjectName =
    projectsData?.projects?.find((p) => p.id === selectedProjectId)?.name || '';

  if (isAuthLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!user) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="text-2xl font-bold text-gray-900">Navo Editor</h1>
          <Select.Root
            value={selectedProjectId || ''}
            onValueChange={handleProjectSelect}
          >
            <Select.Trigger className="inline-flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              <Select.Value placeholder="Select a Project" />
              <Select.Icon>
                <ChevronDownIcon />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden rounded-lg bg-white shadow-lg border border-gray-200">
                <Select.Viewport className="p-1">
                  {isLoadingProjects ? (
                    <Select.Item value="loading" disabled>
                      Loading...
                    </Select.Item>
                  ) : (
                    projectsData?.projects?.map((project) => (
                      <Select.Item key={project.id} value={project.id}>
                        <Select.ItemText>{project.name}</Select.ItemText>
                      </Select.Item>
                    ))
                  )}
                  <Select.Separator />
                  <Select.Item value="new">Create New Project</Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
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
          {!selectedProjectId ? (
            <div className="preview-placeholder">
              <h2>Select a project to start</h2>
              <p>Or create a new one using the chat.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr 1fr',
                height: '100%',
                gap: '1rem',
              }}
            >
              <div className="file-tree-panel">
                <h2 className="text-lg font-medium mb-2">
                  📁 {currentProjectName}
                </h2>
                <FileTree
                  projectId={selectedProjectId}
                  onFileSelect={(nodeId) => setSelectedFileId(nodeId)}
                />
              </div>
              <div className="code-editor-panel">
                <button
                  onClick={handleSave}
                  disabled={
                    updateMutation.isPending ||
                    editedContent === vfsNodeData?.node?.content
                  }
                  className="btn btn-primary mb-2"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                {isLoadingVfsNode ? (
                  <div>Loading file...</div>
                ) : (
                  <CodeEditor
                    content={editedContent}
                    onChange={(value) => setEditedContent(value || '')}
                  />
                )}
              </div>
              <div className="live-preview-panel">
                <h2 className="text-lg font-medium mb-2">Live Preview</h2>
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
            </div>
          )}
        </section>
      </main>
    </>
  );
}
