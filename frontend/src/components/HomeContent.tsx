'use client';

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons';
import * as Select from '@radix-ui/react-select';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { ChatSection } from '@/components/ui/ChatSection';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { ComponentBuilderSection } from '@/components/ui/ComponentBuilderSection';
import { FileTree } from '@/components/ui/FileTree';
import { GenerateDummySuggestionButton } from '@/components/ui/GenerateDummySuggestionButton';
import { MobileChat } from '@/components/ui/MobileChat';
import { ProfileMenu } from '@/components/ui/ProfileMenu';
import { ProjectGenerationSection } from '@/components/ui/ProjectGenerationSection';
import { ProjectListSection } from '@/components/ui/ProjectListSection';
import { SaveButton } from '@/components/ui/SaveButton';
import { StatusDisplay } from '@/components/ui/StatusDisplay';
import { SuggestionsSection } from '@/components/ui/SuggestionsSection';
import {
  useDeleteProject,
  useListProjects,
  useRenameProject,
  useUpdateVfsNodeContent,
  useVfsNodeContent,
} from '@/lib/api';

export default function HomeContent() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const { data: vfsNodeData, isLoading: isLoadingVfsNode } = useVfsNodeContent(
    selectedProjectId || '',
    selectedFileId,
  );

  useEffect(() => {
    if (vfsNodeData?.node?.content) {
      setEditedContent(vfsNodeData.node.content);
    } else {
      setEditedContent(null);
    }
  }, [vfsNodeData]);

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

  // ... (other hooks and handlers from before)

  if (!isAuthenticated || !token) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <>
      <header className="topbar">{/* ... */}</header>
      <main className="layout">
        <section className="ai-chat-interface">{/* ... */}</section>
        <section className="project-preview">
          {!selectedProjectId ? (
            <div className="preview-placeholder">{/* ... */}</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr',
                height: '100%',
                gap: '1rem',
              }}
            >
              <div className="file-tree-panel">
                <FileTree
                  projectId={selectedProjectId}
                  onFileSelect={(nodeId) => setSelectedFileId(nodeId)}
                />
              </div>
              <div className="code-editor-panel">
                <div style={{ marginBottom: '0.5rem' }}>
                  <button
                    onClick={handleSave}
                    disabled={
                      updateMutation.isPending ||
                      editedContent === vfsNodeData?.node?.content
                    }
                    className="btn btn-primary"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {isLoadingVfsNode ? (
                  <div>Loading file...</div>
                ) : (
                  <CodeEditor
                    content={editedContent}
                    onChange={(value) => setEditedContent(value || '')}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      {/* ... (side panel and modals) */}
    </>
  );
}
