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
  fetchApi,
  useDeleteProject,
  useListProjects,
  useRenameProject,
  useVfsNodeContent,
} from '@/lib/api';

type ProjectStructure = { pages?: unknown[]; componentDefinitions?: unknown[] };

export default function HomeContent() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [incompleteProject, setIncompleteProject] = useState<{
    id: string;
    name: string;
  } | null>(null);
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

  const showSuccessMessage = (text: string) => {
    setShowMessage({ type: 'success', text });
    setTimeout(() => setShowMessage(null), 3000);
  };

  const showErrorMessage = (text: string) => {
    setShowMessage({ type: 'error', text });
    setTimeout(() => setShowMessage(null), 5000);
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push('/login');
    }
  }, [isAuthenticated, token, router]);

  useEffect(() => {
    const handleTabClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target?.classList.contains('panel-tab')) {
        const tabName = target.getAttribute('data-tab');
        if (tabName) {
          document
            .querySelectorAll('.panel-tab, .panel-tab-content')
            .forEach((el) => el.classList.remove('active'));
          target.classList.add('active');
          document
            .querySelector(`.panel-tab-content[data-tab="${tabName}"]`)
            ?.classList.add('active');
        }
      }
    };
    document.addEventListener('click', handleTabClick);
    return () => document.removeEventListener('click', handleTabClick);
  }, []);

  const { data: projectsData } = useListProjects();
  const currentProjectName =
    projectsData?.projects?.find((p) => p.id === selectedProjectId)?.name || '';

  const renameMutation = useRenameProject({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showSuccessMessage('Project name updated.');
      setIsRenaming(false);
    },
    onError: () => showErrorMessage('Failed to update project name.'),
  });

  const deleteMutation = useDeleteProject({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showSuccessMessage('Project deleted.');
      setSelectedProjectId(null);
      setSelectedFileId(null);
    },
    onError: () => showErrorMessage('Failed to delete project.'),
  });

  const handleProjectSelect = (projectId: string) => {
    if (projectId === 'new') {
      setSelectedProjectId(null);
      setSelectedFileId(null);
      queryClient.clear();
      window.location.reload();
      return;
    }
    setSelectedProjectId(projectId);
    setSelectedFileId(null); // Reset file selection when project changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('navo_selected_projectId', projectId);
    }
  };

  const handleFileSelect = (nodeId: string) => {
    setSelectedFileId(nodeId);
  };

  if (!isAuthenticated || !token) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <>
      <header className="topbar">
        {/* Header content remains the same */}
      </header>
      <main className="layout">
        <section className="ai-chat-interface" aria-label="AI Chat Interface">
          <div className="chat-messages">
            <ChatSection />
          </div>
        </section>

        <section
          className="project-preview"
          id="preview"
          aria-label="Project Preview"
        >
          {!selectedProjectId || selectedProjectId === 'new' ? (
            <div className="preview-placeholder">
              <div className="preview-header">
                <div className="preview-icon">📁</div>
                <h2>
                  {selectedProjectId === 'new'
                    ? 'Create New Project'
                    : 'Select a Project'}
                </h2>
                <p>
                  {selectedProjectId === 'new'
                    ? 'Describe your project requirements in the chat.'
                    : 'Your project file explorer will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr',
                height: '100%',
                gap: '1rem',
              }}
            >
              <div
                className="file-tree-panel"
                style={{
                  borderRight: '1px solid #eee',
                  paddingRight: '1rem',
                  overflowY: 'auto',
                }}
              >
                <h2 className="text-lg font-medium mb-2">
                  📁 {currentProjectName || 'Project Files'}
                </h2>
                <FileTree
                  projectId={selectedProjectId}
                  onFileSelect={handleFileSelect}
                />
              </div>
              <div className="code-editor-panel">
                {isLoadingVfsNode ? (
                  <div>Loading file...</div>
                ) : (
                  <CodeEditor
                    content={vfsNodeData?.node?.content ?? null}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      {/* Side panel and modals remain the same */}
    </>
  );
}