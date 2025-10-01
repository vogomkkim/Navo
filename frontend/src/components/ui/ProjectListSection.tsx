'use client';

import { useState } from 'react';

import { useListProjects, useRenameProject, useDeleteProject } from '@/hooks/api';

export function ProjectListSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useListProjects({
    enabled: isPanelOpen, // Only fetch when panel is open
  });

  const renameMutation = useRenameProject({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = useDeleteProject({
    onSuccess: () => {
      refetch();
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setNewName(currentName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewName('');
  };

  const submitEdit = (id: string) => {
    const name = newName.trim();
    if (name.length < 2) return;
    renameMutation.mutate({ projectId: id, name });
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`프로젝트 "${name}"을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      deleteMutation.mutate({ projectId: id });
    }
  };

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <div className="panel-section project-list-toggle-section">
        <button
          id="toggleProjectListBtn"
          className="toggle-section-btn"
          onClick={togglePanel}
        >
          내 프로젝트
        </button>
      </div>

      <div
        className={`project-list-panel ${isPanelOpen ? 'open' : ''}`}
        id="projectListPanel"
      >
        <div className="panel-section project-list-section">
          <div className="section-header">
            <h2>내 프로젝트</h2>
            <button
              id="closeProjectListBtn"
              className="close-btn"
              onClick={closePanel}
            >
              ×
            </button>
          </div>
          <ul id="projectList" className="project-list">
            {isLoading && <p>프로젝트 로딩 중...</p>}
            {isError && <p>오류: {error?.message}</p>}
            {data?.projects.length === 0 && !isLoading && (
              <p>프로젝트를 찾을 수 없습니다.</p>
            )}
            {data?.projects.map((project: any) => (
              <li key={project.id}>
                {editingId === project.id ? (
                  <>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitEdit(project.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="rename-input"
                      autoFocus
                    />
                    <button
                      onClick={() => submitEdit(project.id)}
                      disabled={renameMutation.isPending}
                    >
                      저장
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={renameMutation.isPending}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <span>{project.name}</span>{' '}
                    <span>
                      (생성일:{' '}
                      {new Date(project.createdAt).toLocaleDateString()})
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(project.id, project.name)}
                      className="rename-btn"
                      title="이름 변경"
                      aria-label="이름 변경"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project.id, project.name)}
                      className="delete-btn"
                      title="프로젝트 삭제"
                      aria-label="프로젝트 삭제"
                      disabled={deleteMutation.isPending}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {/* TODO: Add back to projects button if needed */}
        </div>
      </div>
    </>
  );
}
